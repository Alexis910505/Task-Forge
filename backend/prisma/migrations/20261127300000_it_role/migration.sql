-- Rol de sistema IT (control informático), justo debajo del Super Admin.
-- Mismos permisos que SYSTEM_ROLE_PERMISSIONS.IT en src/core/security/role-permissions.ts.

-- Un rol personalizado llamado "IT" pasa a ser el rol de sistema (conserva sus usuarios).
UPDATE "Role"
SET "name" = 'IT',
    "isSystem" = true,
    "permissions" = ARRAY[
      'users:read', 'users:write', 'departments:read', 'departments:write',
      'teams:read', 'teams:write', 'notifications:read', 'activity:read',
      'assets:read', 'assets:write', 'organizations:read', 'organizations:write'
    ]::text[],
    "updatedAt" = now()
WHERE upper(trim("name")) = 'IT';

-- Organizaciones que todavía no lo tienen.
INSERT INTO "Role" ("id", "organizationId", "name", "permissions", "isSystem", "createdAt", "updatedAt")
SELECT 'role_it_' || substr(md5(o."id"), 1, 20), o."id", 'IT',
       ARRAY[
         'users:read', 'users:write', 'departments:read', 'departments:write',
         'teams:read', 'teams:write', 'notifications:read', 'activity:read',
         'assets:read', 'assets:write', 'organizations:read', 'organizations:write'
       ]::text[],
       true, now(), now()
FROM "Organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "Role" r WHERE r."organizationId" = o."id" AND upper(trim(r."name")) = 'IT'
);
