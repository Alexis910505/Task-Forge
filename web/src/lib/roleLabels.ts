import type { TFunction } from 'i18next';

/** Etiqueta localizada del enum RoleName del backend. */
export function roleLabel(name: string, t: TFunction): string {
  return t(`users.roleNames.${name}`, { defaultValue: name });
}
