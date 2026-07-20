import { SetMetadata } from '@nestjs/common';
import type { SystemRoleName } from '../security/role-permissions';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: SystemRoleName[]) => SetMetadata(ROLES_KEY, roles);
