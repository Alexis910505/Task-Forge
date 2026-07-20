import type { TFunction } from 'i18next';

type RoleLabelInput = {
  name: string;
};

const SYSTEM_ROLE_NAMES = new Set([
  'ADMIN',
  'DEPT_HEAD',
  'SUPERVISOR',
  'TEAM_LEAD',
  'WORKER',
]);

/** Traduce roles de sistema; los roles personalizados mantienen su nombre estático. */
export function roleLabel(role: string | RoleLabelInput, t: TFunction): string {
  const data: RoleLabelInput =
    typeof role === 'string' ? { name: role } : role;
  if (SYSTEM_ROLE_NAMES.has(data.name)) {
    return t(`users.roleNames.${data.name}`, { defaultValue: data.name });
  }

  return data.name;
}
