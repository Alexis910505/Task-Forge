import type { TFunction } from 'i18next';
import { ALL_PERMISSIONS } from '@/lib/rolePermissions';

/** Orden legible por áreas (usuarios → tareas → informes…). */
export const PERMISSION_DISPLAY_ORDER = [
  'organizations:read',
  'organizations:write',
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
  'activity:read',
  'reports:read',
  'reports:export',
  'assets:read',
  'assets:write',
] as const;

function permI18nKey(perm: string): string {
  return perm.replace(':', '_');
}

export function permissionLabel(perm: string, t: TFunction): string {
  const key = permI18nKey(perm);
  return t(`users.permissionLabels.${key}.label`, { defaultValue: perm });
}

export function permissionHint(perm: string, t: TFunction): string {
  const key = permI18nKey(perm);
  return t(`users.permissionLabels.${key}.hint`, { defaultValue: '' });
}

export function permissionsForDisplay(): string[] {
  const known = new Set<string>(ALL_PERMISSIONS);
  const ordered = PERMISSION_DISPLAY_ORDER.filter((p) => known.has(p));
  const rest = ALL_PERMISSIONS.filter((p) => !PERMISSION_DISPLAY_ORDER.includes(p as (typeof PERMISSION_DISPLAY_ORDER)[number]));
  return [...ordered, ...rest];
}
