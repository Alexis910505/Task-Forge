import { RoleName } from '@prisma/client';

export type PermissionKey =
  | 'users:read'
  | 'users:write'
  | 'departments:read'
  | 'departments:write'
  | 'teams:read'
  | 'teams:write'
  | 'projects:read'
  | 'projects:write'
  | 'boards:read'
  | 'boards:write'
  | 'tasks:read'
  | 'tasks:write'
  | 'tasks:assign'
  | 'comments:write'
  | 'attachments:write'
  | 'notifications:read'
  | 'dashboard:read'
  | 'reports:read'
  | 'reports:export'
  | 'activity:read'
  | 'assets:read'
  | 'assets:write'
  | 'organizations:read'
  | 'organizations:write';

export const ROLE_PERMISSIONS: Record<RoleName, PermissionKey[]> = {
  [RoleName.ADMIN]: [
    'users:read',
    'users:write',
    'departments:read',
    'departments:write',
    'teams:read',
    'teams:write',
    'projects:read',
    'projects:write',
    'boards:read',
    'boards:write',
    'tasks:read',
    'tasks:write',
    'tasks:assign',
    'comments:write',
    'attachments:write',
    'notifications:read',
    'dashboard:read',
    'reports:read',
    'reports:export',
    'activity:read',
    'assets:read',
    'assets:write',
    'organizations:read',
    'organizations:write',
  ],
  [RoleName.MANAGER]: [
    'users:read',
    'departments:read',
    'teams:read',
    'teams:write',
    'projects:read',
    'projects:write',
    'boards:read',
    'boards:write',
    'tasks:read',
    'tasks:write',
    'tasks:assign',
    'comments:write',
    'attachments:write',
    'notifications:read',
    'dashboard:read',
    'reports:read',
    'reports:export',
    'activity:read',
    'assets:read',
    'assets:write',
    'organizations:read',
    'organizations:write',
  ],
  [RoleName.WORKER]: [
    'departments:read',
    'teams:read',
    'projects:read',
    'boards:read',
    'tasks:read',
    'tasks:write',
    'comments:write',
    'attachments:write',
    'notifications:read',
    'dashboard:read',
    'activity:read',
    'assets:read',
    'assets:write',
    'organizations:read',
  ],
  [RoleName.INSPECTOR]: [
    'departments:read',
    'projects:read',
    'boards:read',
    'tasks:read',
    'tasks:write',
    'comments:write',
    'attachments:write',
    'notifications:read',
    'dashboard:read',
    'reports:read',
    'reports:export',
    'activity:read',
    'assets:read',
    'assets:write',
    'organizations:read',
  ],
  [RoleName.VIEWER]: [
    'departments:read',
    'projects:read',
    'boards:read',
    'tasks:read',
    'notifications:read',
    'dashboard:read',
    'reports:read',
    'activity:read',
    'assets:read',
    'organizations:read',
  ],
};

export function roleHasPermission(role: RoleName, permission: PermissionKey): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
