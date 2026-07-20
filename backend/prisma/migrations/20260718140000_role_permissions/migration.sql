-- AlterTable: permisos persistidos y nombre libre para roles custom
ALTER TABLE "Role" ADD COLUMN IF NOT EXISTS "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Role" ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN NOT NULL DEFAULT false;

-- Convertir Role.name de enum RoleName a TEXT
ALTER TABLE "Role" ALTER COLUMN "name" TYPE TEXT USING ("name"::text);

-- Sembrar permisos por defecto de los roles de sistema existentes
UPDATE "Role" SET "isSystem" = true, "permissions" = ARRAY[
  'users:read','users:write','departments:read','departments:write','teams:read','teams:write',
  'projects:read','projects:write','boards:read','boards:write','tasks:read','tasks:write','tasks:assign',
  'comments:write','attachments:write','notifications:read','dashboard:read','reports:read','reports:export',
  'activity:read','assets:read','assets:write','organizations:read','organizations:write'
]::TEXT[] WHERE "name" = 'ADMIN';

UPDATE "Role" SET "isSystem" = true, "permissions" = ARRAY[
  'users:read','departments:read','teams:read','teams:write','projects:read','projects:write',
  'boards:read','boards:write','tasks:read','tasks:write','tasks:assign','comments:write','attachments:write',
  'notifications:read','dashboard:read','reports:read','reports:export','activity:read','assets:read',
  'assets:write','organizations:read','organizations:write'
]::TEXT[] WHERE "name" = 'MANAGER';

UPDATE "Role" SET "isSystem" = true, "permissions" = ARRAY[
  'departments:read','teams:read','projects:read','boards:read','tasks:read','tasks:write','comments:write',
  'attachments:write','notifications:read','dashboard:read','activity:read','assets:read','assets:write',
  'organizations:read'
]::TEXT[] WHERE "name" = 'WORKER';

UPDATE "Role" SET "isSystem" = true, "permissions" = ARRAY[
  'departments:read','projects:read','boards:read','tasks:read','tasks:write','comments:write','attachments:write',
  'notifications:read','dashboard:read','reports:read','reports:export','activity:read','assets:read',
  'assets:write','organizations:read'
]::TEXT[] WHERE "name" = 'INSPECTOR';

UPDATE "Role" SET "isSystem" = true, "permissions" = ARRAY[
  'departments:read','projects:read','boards:read','tasks:read','notifications:read','dashboard:read',
  'reports:read','activity:read','assets:read','organizations:read'
]::TEXT[] WHERE "name" = 'VIEWER';

-- El enum RoleName ya no se usa en columnas; se elimina el tipo.
DROP TYPE IF EXISTS "RoleName";
