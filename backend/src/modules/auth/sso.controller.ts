import { Body, Controller, Get, Param, Post, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import * as crypto from 'crypto';
import type { Request, Response } from 'express';
import { Public } from '../../core/decorators/public.decorator';
import { AcceptInvitationDto, MicrosoftExchangeDto, MicrosoftStartQueryDto } from './dto/sso.dto';
import { InvitationsService } from './invitations.service';
import { MicrosoftAuthService } from './microsoft-auth.service';

const NONCE_COOKIE = 'tf_ms_nonce';

function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

@ApiTags('auth')
@Controller('auth')
export class SsoController {
  constructor(
    private readonly microsoft: MicrosoftAuthService,
    private readonly invitations: InvitationsService,
  ) {}

  @Public()
  @Get('providers')
  @ApiOperation({ summary: 'Formas de entrar disponibles (para mostrar el botón de Microsoft)' })
  providers() {
    return { microsoft: this.microsoft.enabled };
  }

  @Public()
  @Get('microsoft/start')
  @ApiOperation({ summary: 'Redirige a Microsoft para entrar' })
  async microsoftStart(@Query() q: MicrosoftStartQueryDto, @Req() req: Request, @Res() res: Response) {
    const nonce = crypto.randomBytes(16).toString('base64url');
    const url = await this.microsoft.authorizeUrl(
      { org: q.org ?? 'default', platform: q.platform ?? 'web', invite: q.invite, clientId: q.clientId },
      nonce,
    );
    // Liga la vuelta de Microsoft a este navegador (evita que otro inicie sesión por ti).
    res.cookie(NONCE_COOKIE, nonce, {
      httpOnly: true,
      secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60 * 1000,
    });
    res.redirect(302, url);
  }

  @Public()
  @Get('microsoft/callback')
  @ApiOperation({ summary: 'Vuelta desde Microsoft (no se llama a mano)' })
  async microsoftCallback(
    @Query() q: { code?: string; state?: string; error?: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const target = await this.microsoft.handleCallback(q, readCookie(req, NONCE_COOKIE));
    res.clearCookie(NONCE_COOKIE, { path: '/' });
    res.redirect(302, target);
  }

  @Public()
  @Post('microsoft/exchange')
  @ApiOperation({ summary: 'Cambiar el código de un solo uso por la sesión' })
  microsoftExchange(@Body() dto: MicrosoftExchangeDto) {
    return this.microsoft.exchangeHandoff(dto.code);
  }

  @Public()
  @Get('invitations/:token')
  @ApiOperation({ summary: 'Datos del enlace de invitación' })
  invitation(@Param('token') token: string) {
    return this.invitations.describe(token);
  }

  @Public()
  @Post('invitations/:token/accept')
  @ApiOperation({ summary: 'Activar la cuenta creando una contraseña' })
  acceptInvitation(@Param('token') token: string, @Body() dto: AcceptInvitationDto) {
    return this.invitations.acceptWithPassword(token, dto.password, dto);
  }
}
