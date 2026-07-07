/// Espejo de `backend/src/core/security/role-permissions.ts` y `web/src/lib/rolePermissions.ts`.
const _rolePermissions = <String, List<String>>{
  'ADMIN': [
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
  'MANAGER': [
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
  'WORKER': [
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
  'INSPECTOR': [
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
  'VIEWER': [
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

bool roleHasPermission(String? role, String permission) {
  if (role == null || role.isEmpty) {
    return false;
  }
  final perms = _rolePermissions[role];
  return perms?.contains(permission) ?? false;
}

String? roleNameFromProfile(Map<String, dynamic>? profile) {
  final role = profile?['role'];
  if (role is Map) {
    return role['name']?.toString();
  }
  return null;
}
