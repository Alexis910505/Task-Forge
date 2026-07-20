/** Claves de permiso canónicas (allowlist). */
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

/** Códigos de los roles sembrados al crear una organización (orden jerárquico). */
export const SYSTEM_ROLE_NAMES = [
  'ADMIN',
  'DEPT_HEAD',
  'SUPERVISOR',
  'TEAM_LEAD',
  'WORKER',
] as const;

export type SystemRoleName = (typeof SYSTEM_ROLE_NAMES)[number];

/**
 * Rank jerárquico: menor número = más autoridad.
 * Roles personalizados no tienen rank (solo ADMIN los gestiona).
 */
export const SYSTEM_ROLE_RANK: Record<SystemRoleName, number> = {
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
  return SYSTEM_ROLE_RANK[role as SystemRoleName];
}

/** Puede gestionar a otro usuario si es el propio o el target tiene rol estrictamente inferior. */
export function canManageUserByHierarchy(
  actorRole: string,
  actorUserId: string,
  targetRole: string,
  targetUserId: string,
): boolean {
  if (actorUserId === targetUserId) {
    return true;
  }
  return canManageOtherUserByHierarchy(actorRole, targetRole);
}

/** Gestión de terceros: ADMIN cualquiera; resto solo roles de sistema estrictamente inferiores. */
export function canManageOtherUserByHierarchy(
  actorRole: string,
  targetRole: string,
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

/** Puede asignar un rol si es estrictamente inferior al del actor (ADMIN: cualquiera). */
export function canAssignRole(actorRole: string, newRoleName: string): boolean {
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

export const ALL_PERMISSIONS: PermissionKey[] = [
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
];

const PERM_SET = new Set<string>(ALL_PERMISSIONS);

/** Permisos por defecto de cada rol de sistema (seed / bootstrap). */
export const SYSTEM_ROLE_PERMISSIONS: Record<SystemRoleName, PermissionKey[]> = {
  ADMIN: [...ALL_PERMISSIONS],
  /** Jefe de departamento: gestiona su depto y todos sus equipos. */
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
  /** Supervisor: supervisa varios equipos asignados; gestiona roles inferiores; no crea/elimina equipos. */
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
  /** Jefe de equipo: gestiona solo los equipos a los que pertenece. */
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
};

/** @deprecated Usar SYSTEM_ROLE_PERMISSIONS; se mantiene por compatibilidad con clientes. */
export const ROLE_PERMISSIONS = SYSTEM_ROLE_PERMISSIONS;

export function isPermissionKey(value: string): value is PermissionKey {
  return PERM_SET.has(value);
}

export function sanitizePermissions(input: string[] | undefined): PermissionKey[] {
  if (!input?.length) return [];
  const unique = new Set<PermissionKey>();
  for (const p of input) {
    if (isPermissionKey(p)) unique.add(p);
  }
  return [...unique];
}

export function hasPermission(
  permissions: readonly string[] | undefined,
  permission: PermissionKey,
): boolean {
  return permissions?.includes(permission) ?? false;
}

/** Fallback por nombre de rol de sistema (p. ej. JWT antiguo sin permissions en DB). */
export function roleHasPermission(
  role: string | undefined,
  permission: PermissionKey,
): boolean {
  if (!role || !(role in SYSTEM_ROLE_PERMISSIONS)) {
    return false;
  }
  return SYSTEM_ROLE_PERMISSIONS[role as SystemRoleName].includes(permission);
}
