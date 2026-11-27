import type { ConfigService } from '@nestjs/config';

const trim = (u: string) => u.replace(/\/+$/, '');

/** URL pública de esta API (para el redirect de Microsoft). */
export function publicApiUrl(config: ConfigService): string {
  return trim(config.get<string>('PUBLIC_API_URL') ?? `http://localhost:${config.get<string>('PORT') ?? '3000'}`);
}

/** URL de la web (enlaces de invitación y vuelta tras entrar con Microsoft). */
export function webAppUrl(config: ConfigService): string {
  const explicit = config.get<string>('WEB_APP_URL');
  if (explicit) return trim(explicit);
  const cors = (config.get<string>('CORS_ORIGIN') ?? '').split(',')[0]?.trim();
  return trim(cors && cors !== '*' ? cors : 'http://localhost:5173');
}
