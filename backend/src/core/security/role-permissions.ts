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
  /** Ver tareas de otras personas (sin él: solo las suyas, las «para todos» y las que creó). */
  | 'tasks:read_all'
  | 'tasks:write'
  /** Cambiar datos (título, fecha…) de tareas que no creó. */
  | 'tasks:edit_all'
  | 'tasks:assign'
  | 'comments:write'
  | 'attachments:write'
  | 'notifications:read'
  | 'dashboard:read'
  /** Trabajo/panel con datos de toda la organización (sin él: solo lo suyo). */
  | 'dashboard:read_all'
  | 'reports:read'
  | 'reports:export'
  | 'activity:read'
  /** Actividad de toda la organización (sin él: solo la de sus tareas). */
  | 'activity:read_all'
  | 'assets:read'
  | 'assets:write'
  | 'organizations:read'
  | 'organizations:write';

/** Códigos de los roles sembrados al crear una organización (orden jerárquico). */
export const SYSTEM_ROLE_NAMES = [
  'ADMIN',
  'IT',
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
  IT: 1,
  DEPT_HEAD: 2,
  SUPERVISOR: 3,
  TEAM_LEAD: 4,
  WORKER: 5,
};

/**
 * Roles que administran accesos: crean usuarios, cambian correo/contraseña y
 * gestionan roles personalizados. IT no puede tocar al Super Admin ni a otro IT.
 */
export function isAccessManagerRole(role: string | undefined): boolean {
  return role === 'ADMIN' || role === 'IT';
}

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

/**
 * Gestión de terceros: ADMIN cualquiera; IT cualquiera salvo ADMIN/IT (incluidos roles
 * personalizados); resto solo roles de sistema estrictamente inferiores.
 */
export function canManageOtherUserByHierarchy(
  actorRole: string,
  targetRole: string,
): boolean {
  if (actorRole === 'ADMIN') {
    return true;
  }
  if (actorRole === 'IT') {
    return targetRole !== 'ADMIN' && targetRole !== 'IT';
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
  if (actorRole === 'IT') {
    // Cualquier rol por debajo de IT, incluidos los personalizados.
    return newRoleName !== 'ADMIN' && newRoleName !== 'IT';
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
  'tasks:read_all',
  'tasks:write',
  'tasks:edit_all',
  'tasks:assign',
  'comments:write',
  'attachments:write',
  'notifications:read',
  'dashboard:read',
  'dashboard:read_all',
  'reports:read',
  'reports:export',
  'activity:read',
  'activity:read_all',
  'assets:read',
  'assets:write',
  'organizations:read',
  'organizations:write',
];

const PERM_SET = new Set<string>(ALL_PERMISSIONS);

/** Permisos por defecto de cada rol de sistema (seed / bootstrap). */
export const SYSTEM_ROLE_PERMISSIONS: Record<SystemRoleName, PermissionKey[]> = {
  ADMIN: [...ALL_PERMISSIONS],
  /**
   * IT: control informático. Usuarios y accesos, roles personalizados, estructura
   * (departamentos y equipos), ajustes de la organización, activos y auditoría.
   * No ve tareas, proyectos, reportes ni rutinas compartidas.
   */
  IT: [
    'users:read',
    'users:write',
    'departments:read',
    'departments:write',
    'teams:read',
    'teams:write',
    'notifications:read',
    'activity:read',
    'activity:read_all',
    'assets:read',
    'assets:write',
    'organizations:read',
    'organizations:write',
  ],
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
    'tasks:read_all',
    'tasks:write',
    'tasks:edit_all',
    'tasks:assign',
    'comments:write',
    'attachments:write',
    'notifications:read',
    'dashboard:read',
    'dashboard:read_all',
    'reports:read',
    'reports:export',
    'activity:read',
    'activity:read_all',
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
    'tasks:read_all',
    'tasks:write',
    'tasks:edit_all',
    'tasks:assign',
    'comments:write',
    'attachments:write',
    'notifications:read',
    'dashboard:read',
    'dashboard:read_all',
    'reports:read',
    'activity:read',
    'activity:read_all',
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
    'tasks:read_all',
    'tasks:write',
    'tasks:edit_all',
    'tasks:assign',
    'comments:write',
    'attachments:write',
    'notifications:read',
    'dashboard:read',
    'dashboard:read_all',
    'activity:read',
    'activity:read_all',
    'assets:read',
    'assets:write',
    'organizations:read',
  ],
  /** Operario: sus tareas y las «para todos»; activos solo lectura. */
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

/**
 * ¿El usuario tiene este permiso? Manda lo guardado en su rol (tabla de Permisos).
 * Solo si el rol no tiene ningún permiso guardado se usan los de fábrica por nombre.
 */
export function userCan(
  user: { role: string; permissions?: readonly string[] },
  permission: PermissionKey,
): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.permissions && user.permissions.length > 0) {
    return user.permissions.includes(permission);
  }
  return roleHasPermission(user.role, permission);
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
