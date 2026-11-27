-- Operario (WORKER): los activos pasan a ser de solo lectura.
-- Mismo cambio que SYSTEM_ROLE_PERMISSIONS.WORKER en src/core/security/role-permissions.ts.
UPDATE "Role"
SET "permissions" = array_remove("permissions", 'assets:write'),
    "updatedAt" = now()
WHERE "isSystem" = true AND "name" = 'WORKER';
