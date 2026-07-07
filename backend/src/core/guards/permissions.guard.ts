import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '@prisma/client';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionKey, roleHasPermission } from '../security/role-permissions';

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
    const request = context.switchToHttp().getRequest<{ user?: { role: RoleName } }>();
    const role = request.user?.role;
    if (!role) {
      throw new ForbiddenException();
    }
    const ok = required.every((p) => roleHasPermission(role, p));
    if (!ok) {
      throw new ForbiddenException('Permisos insuficientes');
    }
    return true;
  }
}
