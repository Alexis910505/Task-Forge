/** Espejo del catálogo de permisos del backend (`role-permissions.ts`). */
export const ALL_PERMISSIONS = [
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
] as const;

export type PermissionKey = (typeof ALL_PERMISSIONS)[number];

/** Permisos por defecto de roles de sistema (fallback / documentación). */
export const ROLE_PERMISSIONS = {
  ADMIN: [...ALL_PERMISSIONS],
  DEPT_HEAD: [
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
  ],
  SUPERVISOR: [
    'users:read',
    'users:write',
    'departments:read',
    'teams:read',
    'teams:write',
    'projects:read',
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
    'activity:read',
    'assets:read',
    'assets:write',
    'organizations:read',
  ],
  TEAM_LEAD: [
    'users:read',
    'users:write',
    'departments:read',
    'teams:read',
    'teams:write',
    'projects:read',
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
    'assets:read',
    'assets:write',
    'organizations:read',
  ],
  WORKER: [
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
} as const;

export type RoleNameKey = keyof typeof ROLE_PERMISSIONS;

/** Rank: menor número = más autoridad. Roles personalizados no tienen rank. */
export const SYSTEM_ROLE_RANK: Record<RoleNameKey, number> = {
  ADMIN: 0,
  DEPT_HEAD: 1,
  SUPERVISOR: 2,
  TEAM_LEAD: 3,
  WORKER: 4,
};

export function getRoleRank(role: string | undefined): number | null {
  if (!role || !(role in SYSTEM_ROLE_RANK)) {
    return null;
  }
  return SYSTEM_ROLE_RANK[role as RoleNameKey];
}

export function canManageOtherUserByHierarchy(
  actorRole: string | undefined,
  targetRole: string | undefined,
): boolean {
  if (actorRole === 'ADMIN') {
    return true;
  }
  const actorRank = getRoleRank(actorRole);
  const targetRank = getRoleRank(targetRole);
  if (actorRank == null || targetRank == null) {
    return false;
  }
  return actorRank < targetRank;
}

/** Editar: propio usuario o rol estrictamente inferior. */
export function canEditUserByHierarchy(
  actor: { id?: string; role?: { name?: string } | null } | null | undefined,
  target: { id: string; role?: { name?: string } | null },
): boolean {
  if (!actor?.id || !actor.role?.name) {
    return false;
  }
  if (actor.id === target.id) {
    return true;
  }
  return canManageOtherUserByHierarchy(actor.role.name, target.role?.name);
}

/** Eliminar: solo roles inferiores (nunca a sí mismo). */
export function canDeleteUserByHierarchy(
  actor: { id?: string; role?: { name?: string } | null } | null | undefined,
  target: { id: string; role?: { name?: string } | null },
): boolean {
  if (!actor?.id || !actor.role?.name) {
    return false;
  }
  if (actor.id === target.id) {
    return false;
  }
  return canManageOtherUserByHierarchy(actor.role.name, target.role?.name);
}

/** Asignar rol: ADMIN cualquiera; resto solo roles de sistema inferiores. */
export function canAssignRoleByHierarchy(
  actorRole: string | undefined,
  newRoleName: string,
): boolean {
  if (actorRole === 'ADMIN') {
    return true;
  }
  const actorRank = getRoleRank(actorRole);
  const newRank = getRoleRank(newRoleName);
  if (actorRank == null || newRank == null) {
    return false;
  }
  return actorRank < newRank;
}

type PermissionBearer = {
  role?: {
    name?: string;
    permissions?: string[];
  } | null;
} | null | undefined;

/** Preferir permisos del rol en sesión; fallback al mapa de roles de sistema. */
export function userHasPermission(
  user: PermissionBearer,
  permission: string,
): boolean {
  const perms = user?.role?.permissions;
  if (Array.isArray(perms)) {
    return perms.includes(permission);
  }
  return roleHasPermission(user?.role?.name, permission);
}

export function roleHasPermission(
  role: RoleNameKey | string | undefined,
  permission: string,
): boolean {
  if (!role || !(role in ROLE_PERMISSIONS)) {
    return false;
  }
  return (ROLE_PERMISSIONS[role as RoleNameKey] as readonly string[]).includes(permission);
}
