import { BadRequestException, GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { webAppUrl } from '../../core/config/app-urls';
import { MailService } from '../../core/mail/mail.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import type { ClientSessionDto } from './dto/client-session.dto';
import { AuthService } from './auth.service';
import { MicrosoftAuthService } from './microsoft-auth.service';

/** Días que vale un enlace de invitación. */
const INVITE_DAYS = 7;

export function hashInviteToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly auth: AuthService,
    private readonly microsoft: MicrosoftAuthService,
  ) {}

  /** Genera (o regenera) el enlace de invitación y lo envía por correo si hay correo configurado. */
  async invite(organizationId: string, userId: string, invitedBy?: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
      include: { organization: true },
    });
    if (!user) throw new NotFoundException();
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { inviteTokenHash: hashInviteToken(token), inviteExpiresAt: expiresAt },
    });
    const url = `${webAppUrl(this.config)}/invite/${token}`;
    const emailSent = await this.mail.send(
      this.inviteEmail({
        to: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        org: user.organization.name,
        invitedBy,
        url,
        microsoft: this.microsoft.enabled,
      }),
    );
    return { url, emailSent, expiresAt, mailConfigured: this.mail.enabled };
  }

  /** Datos que muestra la página del enlace (sin datos sensibles). */
  async describe(token: string) {
    const user = await this.findByToken(token);
    return {
      email: user.email,
      firstName: user.firstName,
      organizationName: user.organization.name,
      organizationSlug: user.organization.slug,
      microsoft: this.microsoft.enabled,
    };
  }

  /** Activar la cuenta con una contraseña propia (para quien no usa Microsoft). */
  async acceptWithPassword(token: string, password: string, session: ClientSessionDto) {
    if (password.length < 8) throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');
    const user = await this.findByToken(token);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(password, 10),
        inviteTokenHash: null,
        inviteExpiresAt: null,
      },
    });
    return this.auth.issueTokensForUser(user.id, session);
  }

  private async findByToken(token: string) {
    const user = await this.prisma.user.findUnique({
      where: { inviteTokenHash: hashInviteToken(token) },
      include: { organization: true },
    });
    if (!user || !user.isActive) throw new NotFoundException('Invitación no válida');
    if (!user.inviteExpiresAt || user.inviteExpiresAt < new Date()) {
      throw new GoneException('La invitación caducó; pide que te la envíen de nuevo');
    }
    return user;
  }

  private inviteEmail(p: {
    to: string;
    name: string;
    org: string;
    invitedBy?: string;
    url: string;
    microsoft: boolean;
  }) {
    const n = escapeHtml(p.name || p.to);
    const org = escapeHtml(p.org);
    const by = p.invitedBy ? escapeHtml(p.invitedBy) : null;
    const how = p.microsoft
      ? 'Pulsa el botón y luego <b>«Entrar con Microsoft»</b>: usarás el mismo usuario y contraseña de tu computadora del trabajo.'
      : 'Pulsa el botón y crea tu contraseña.';
    const howEn = p.microsoft
      ? 'Click the button, then <b>“Sign in with Microsoft”</b>: you will use the same account as your work computer.'
      : 'Click the button and create your password.';
    const html = `<!doctype html><html><body style="margin:0;background:#f5f5fa;font-family:Arial,Helvetica,sans-serif;color:#1b1b21">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px" cellpadding="0" cellspacing="0"><tr><td>
<h1 style="margin:0 0 16px;font-size:22px">Hola, ${n}</h1>
<p style="font-size:17px;line-height:1.5;margin:0 0 12px">${by ? `${by} te invitó` : 'Te invitaron'} a usar <b>Task Forge</b> en <b>${org}</b>.</p>
<p style="font-size:17px;line-height:1.5;margin:0 0 24px">${how}</p>
<p style="text-align:center;margin:0 0 24px"><a href="${p.url}" style="display:inline-block;background:#4648d4;color:#ffffff;text-decoration:none;font-size:18px;font-weight:bold;padding:16px 28px;border-radius:10px">Activar mi cuenta</a></p>
<p style="font-size:13px;color:#5a5a66;line-height:1.5;margin:0 0 24px">El enlace vale ${INVITE_DAYS} días. Si el botón no funciona, copia esta dirección en el navegador:<br><a href="${p.url}" style="color:#4648d4;word-break:break-all">${p.url}</a></p>
<hr style="border:none;border-top:1px solid #e4e4ec;margin:0 0 16px">
<p style="font-size:13px;color:#5a5a66;line-height:1.5;margin:0">You were invited to Task Forge at ${org}. ${howEn} The link is valid for ${INVITE_DAYS} days.</p>
</td></tr></table></td></tr></table></body></html>`;
    const text = `Hola, ${p.name || p.to}\n\n${p.invitedBy ? `${p.invitedBy} te invitó` : 'Te invitaron'} a usar Task Forge en ${p.org}.\n${
      p.microsoft ? 'Abre el enlace y pulsa «Entrar con Microsoft» (el mismo usuario de tu computadora del trabajo).' : 'Abre el enlace y crea tu contraseña.'
    }\n\n${p.url}\n\nEl enlace vale ${INVITE_DAYS} días.`;
    return { to: p.to, toName: p.name, subject: `Tu acceso a Task Forge (${p.org})`, html, text };
  }
}
