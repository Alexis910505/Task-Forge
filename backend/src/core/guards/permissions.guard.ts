import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import {
  hasPermission,
  PermissionKey,
  roleHasPermission,
} from '../security/role-permissions';
import type { RequestUser } from '../strategies/jwt.strategy';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionKey[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) {
      return true;
    }
    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException();
    }
    const ok = required.every(
      (p) =>
        hasPermission(user.permissions, p) || roleHasPermission(user.role, p),
    );
    if (!ok) {
      throw new ForbiddenException('Permisos insuficientes');
    }
    return true;
  }
}
