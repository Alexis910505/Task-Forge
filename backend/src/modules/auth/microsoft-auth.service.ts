import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { publicApiUrl, webAppUrl } from '../../core/config/app-urls';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuthService } from './auth.service';

export type MsPlatform = 'web' | 'mobile';

/** Esquema propio de la app móvil para volver tras entrar con Microsoft. */
export const MOBILE_CALLBACK = 'taskforge://auth';

/** Motivos de error que la web y el móvil traducen. */
export type MsErrorCode =
  | 'cancelled'
  | 'session'
  | 'not_registered'
  | 'invite_mismatch'
  | 'invite_invalid'
  | 'other_account'
  | 'tenant'
  | 'failed';

type StateClaims = { n: string; org: string; p: MsPlatform; inv?: string; cid?: string };
type Handoff = { userId: string; platform: MsPlatform; clientId?: string; expires: number };

const HANDOFF_TTL_MS = 2 * 60 * 1000;

function sha256(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

class MsError extends Error {
  constructor(readonly code: MsErrorCode, detail?: string) {
    super(detail ?? code);
  }
}

/**
 * «Entrar con Microsoft» (Microsoft Entra ID, OpenID Connect, flujo de código).
 * La contraseña la comprueba Microsoft; aquí solo se valida el id_token firmado
 * y se busca al usuario por su cuenta vinculada o por su correo.
 */
@Injectable()
export class MicrosoftAuthService {
  private readonly logger = new Logger(MicrosoftAuthService.name);
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
  /** Códigos de un solo uso para pasar la sesión a la web o al móvil sin poner tokens en la URL. */
  private readonly handoffs = new Map<string, Handoff>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly auth: AuthService,
  ) {}

  get enabled(): boolean {
    return Boolean(this.config.get<string>('MS_CLIENT_ID') && this.config.get<string>('MS_CLIENT_SECRET'));
  }

  private get authority() {
    return (this.config.get<string>('MS_AUTHORITY') ?? 'https://login.microsoftonline.com').replace(/\/+$/, '');
  }

  /** `common` (cuentas de empresa y personales), `organizations`, o el id del directorio de la empresa. */
  private get tenant() {
    return this.config.get<string>('MS_TENANT') ?? 'common';
  }

  private get allowedTenants(): string[] {
    return (this.config.get<string>('MS_ALLOWED_TENANTS') ?? '')
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
  }

  private get stateSecret() {
    return `${this.config.getOrThrow<string>('JWT_ACCESS_SECRET')}:ms-state`;
  }

  get redirectUri() {
    return `${publicApiUrl(this.config)}/auth/microsoft/callback`;
  }

  /** URL de Microsoft a la que se envía al usuario. `nonce` se guarda también en una cookie. */
  async authorizeUrl(opts: { org: string; platform: MsPlatform; invite?: string; clientId?: string }, nonce: string) {
    if (!this.enabled) throw new NotFoundException();
    let loginHint: string | undefined;
    if (opts.invite) {
      const invited = await this.prisma.user.findUnique({
        where: { inviteTokenHash: sha256(opts.invite) },
        select: { email: true },
      });
      loginHint = invited?.email;
    }
    const state = await this.jwt.signAsync(
      { n: nonce, org: opts.org, p: opts.platform, inv: opts.invite, cid: opts.clientId } satisfies StateClaims,
      { secret: this.stateSecret, expiresIn: 600 },
    );
    const q = new URLSearchParams({
      client_id: this.config.getOrThrow<string>('MS_CLIENT_ID'),
      response_type: 'code',
      response_mode: 'query',
      redirect_uri: this.redirectUri,
      scope: 'openid profile email',
      state,
      nonce,
      // Con una sola cuenta en el equipo, Microsoft entra sin preguntar.
      ...(loginHint ? { login_hint: loginHint } : { prompt: 'select_account' }),
    });
    return `${this.authority}/${this.tenant}/oauth2/v2.0/authorize?${q.toString()}`;
  }

  /** Procesa la vuelta de Microsoft y devuelve a dónde redirigir (web o app). */
  async handleCallback(q: { code?: string; state?: string; error?: string }, cookieNonce?: string): Promise<string> {
    let claims: StateClaims | null = null;
    try {
      if (!q.state) throw new MsError('session');
      claims = await this.jwt
        .verifyAsync<StateClaims>(q.state, { secret: this.stateSecret })
        .catch(() => {
          throw new MsError('session');
        });
      if (q.error) throw new MsError(q.error === 'access_denied' ? 'cancelled' : 'failed', q.error);
      if (!q.code) throw new MsError('failed', 'sin código');
      if (!cookieNonce || cookieNonce !== claims.n) throw new MsError('session', 'cookie de estado ausente o distinta');

      const idToken = await this.exchangeCode(q.code);
      const p = await this.verifyIdToken(idToken, claims.n);
      const userId = await this.resolveUser(p, claims);
      const code = crypto.randomBytes(24).toString('base64url');
      this.sweep();
      this.handoffs.set(sha256(code), {
        userId,
        platform: claims.p,
        clientId: claims.cid,
        expires: Date.now() + HANDOFF_TTL_MS,
      });
      return this.target(claims.p, { code });
    } catch (e) {
      const code: MsErrorCode = e instanceof MsError ? e.code : 'failed';
      if (!(e instanceof MsError) || code === 'failed') this.logger.warn(`Entrar con Microsoft falló: ${String(e)}`);
      return this.target(claims?.p ?? 'web', { error: code, ...(claims?.inv ? { invite: claims.inv } : {}) });
    }
  }

  /** Cambia el código de un solo uso por la sesión (tokens de la app). */
  async exchangeHandoff(code: string) {
    this.sweep();
    const key = sha256(code);
    const h = this.handoffs.get(key);
    this.handoffs.delete(key);
    if (!h || h.expires < Date.now()) throw new UnauthorizedException('Código caducado; vuelve a entrar');
    return this.auth.issueTokensForUser(h.userId, { platform: h.platform, clientId: h.clientId });
  }

  private target(platform: MsPlatform, params: Record<string, string>) {
    const qs = new URLSearchParams(params).toString();
    return platform === 'mobile' ? `${MOBILE_CALLBACK}?${qs}` : `${webAppUrl(this.config)}/auth/callback?${qs}`;
  }

  private sweep() {
    const now = Date.now();
    for (const [k, v] of this.handoffs) if (v.expires < now) this.handoffs.delete(k);
  }

  private async exchangeCode(code: string): Promise<string> {
    const res = await fetch(`${this.authority}/${this.tenant}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.getOrThrow<string>('MS_CLIENT_ID'),
        client_secret: this.config.getOrThrow<string>('MS_CLIENT_SECRET'),
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
        scope: 'openid profile email',
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id_token?: string; error?: string; error_description?: string };
    if (!res.ok || !body.id_token) {
      throw new MsError('failed', `token ${res.status}: ${body.error ?? ''} ${body.error_description?.slice(0, 200) ?? ''}`);
    }
    return body.id_token;
  }

  private async verifyIdToken(idToken: string, nonce: string) {
    this.jwks ??= createRemoteJWKSet(new URL(`${this.authority}/${this.tenant}/discovery/v2.0/keys`));
    const { payload } = await jwtVerify(idToken, this.jwks, {
      audience: this.config.getOrThrow<string>('MS_CLIENT_ID'),
      clockTolerance: 60,
    }).catch((e: unknown) => {
      throw new MsError('failed', `id_token inválido: ${String(e)}`);
    });
    const p = payload as JWTPayload & {
      tid?: string;
      oid?: string;
      nonce?: string;
      email?: string;
      preferred_username?: string;
    };
    if (p.nonce !== nonce) throw new MsError('session', 'nonce distinto');
    if (!p.tid || !p.oid) throw new MsError('failed', 'faltan tid/oid');
    // Multiinquilino: el emisor debe ser el directorio que firmó (tid).
    if (p.iss !== `${this.authority}/${p.tid}/v2.0`) throw new MsError('failed', `emisor inesperado ${p.iss}`);
    const allowed = this.allowedTenants;
    if (allowed.length && !allowed.includes(p.tid.toLowerCase())) throw new MsError('tenant', p.tid);
    return p as typeof p & { tid: string; oid: string };
  }

  private async resolveUser(
    p: { tid: string; oid: string; email?: string; preferred_username?: string },
    claims: StateClaims,
  ): Promise<string> {
    const email = (p.email ?? p.preferred_username ?? '').trim().toLowerCase();
    const org = await this.prisma.organization.findUnique({ where: { slug: claims.org } });
    if (!org) throw new MsError('not_registered', 'organización');

    let user;
    if (claims.inv) {
      user = await this.prisma.user.findUnique({ where: { inviteTokenHash: sha256(claims.inv) } });
      if (!user || user.organizationId !== org.id || !user.inviteExpiresAt || user.inviteExpiresAt < new Date()) {
        throw new MsError('invite_invalid');
      }
      if (!email || email !== user.email.toLowerCase()) throw new MsError('invite_mismatch', email);
    } else {
      user =
        (await this.prisma.user.findFirst({ where: { organizationId: org.id, microsoftOid: p.oid } })) ??
        (email ? await this.prisma.user.findFirst({ where: { organizationId: org.id, email } }) : null);
    }
    if (!user || !user.isActive) throw new MsError('not_registered', email);
    if (user.microsoftOid && user.microsoftOid !== p.oid) throw new MsError('other_account', email);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        microsoftOid: p.oid,
        microsoftTenantId: p.tid,
        // Entrar con Microsoft con el mismo correo también activa una invitación pendiente.
        inviteTokenHash: null,
        inviteExpiresAt: null,
      },
    });
    return user.id;
  }
}
