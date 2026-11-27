import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type MailMessage = { to: string; toName?: string; subject: string; html: string; text: string };

/**
 * Envío de correos por API HTTPS (Brevo). El plan gratis de Render bloquea SMTP,
 * así que no se usa SMTP. Sin BREVO_API_KEY el envío queda desactivado y quien
 * invita copia el enlace a mano.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return Boolean(this.config.get<string>('BREVO_API_KEY') && this.config.get<string>('MAIL_FROM_EMAIL'));
  }

  /** Devuelve true si el proveedor aceptó el correo. Nunca lanza. */
  async send(msg: MailMessage): Promise<boolean> {
    if (!this.enabled) return false;
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.config.getOrThrow<string>('BREVO_API_KEY'),
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: {
            email: this.config.getOrThrow<string>('MAIL_FROM_EMAIL'),
            name: this.config.get<string>('MAIL_FROM_NAME') ?? 'Task Forge',
          },
          to: [{ email: msg.to, ...(msg.toName ? { name: msg.toName } : {}) }],
          subject: msg.subject,
          htmlContent: msg.html,
          textContent: msg.text,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        this.logger.warn(`Brevo rechazó el correo (${res.status}): ${(await res.text()).slice(0, 300)}`);
        return false;
      }
      return true;
    } catch (e) {
      this.logger.warn(`No se pudo enviar el correo: ${String(e)}`);
      return false;
    }
  }
}
