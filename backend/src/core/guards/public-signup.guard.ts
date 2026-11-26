import { CanActivate, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Bloquea el alta pública de usuarios/organizaciones con `PUBLIC_SIGNUP=false`. */
@Injectable()
export class PublicSignupGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(): boolean {
    if (this.config.get<string>('PUBLIC_SIGNUP') === 'false') {
      throw new ForbiddenException('El registro público está deshabilitado');
    }
    return true;
  }
}
