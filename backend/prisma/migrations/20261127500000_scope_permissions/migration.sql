-- Permisos de alcance: lo que cada rol ve de otras personas se decide en la tabla de Permisos.
--   tasks:read_all      ver tareas de otras personas
--   tasks:edit_all      cambiar datos de tareas que no creó
--   dashboard:read_all  Trabajo/panel de toda la organización
--   activity:read_all   actividad de toda la organización
-- Se añaden a los roles que ya veían todo, para que no cambie su comportamiento.
-- El Operario (WORKER) no los recibe: ve solo lo suyo.

CREATE OR REPLACE FUNCTION pg_temp.add_perms(perms text[], extra text[]) RETURNS text[] AS $$
  SELECT ARRAY(SELECT DISTINCT unnest(perms || extra) ORDER BY 1);
$$ LANGUAGE sql IMMUTABLE;

-- Roles de gestión de fábrica.
UPDATE "Role"
SET "permissions" = pg_temp.add_perms("permissions",
      ARRAY['tasks:read_all', 'tasks:edit_all', 'dashboard:read_all', 'activity:read_all']),
    "updatedAt" = now()
WHERE "isSystem" = true AND "name" IN ('ADMIN', 'DEPT_HEAD', 'SUPERVISOR', 'TEAM_LEAD');

-- IT: auditoría de toda la organización.
UPDATE "Role"
SET "permissions" = pg_temp.add_perms("permissions", ARRAY['activity:read_all']),
    "updatedAt" = now()
WHERE "isSystem" = true AND "name" = 'IT';

-- Roles personalizados: hasta ahora veían todo; se mantiene igual según lo que ya podían leer.
UPDATE "Role"
SET "permissions" = pg_temp.add_perms("permissions",
      ARRAY(SELECT x FROM unnest(ARRAY[
        CASE WHEN 'tasks:read' = ANY("permissions") THEN 'tasks:read_all' END,
        CASE WHEN 'tasks:write' = ANY("permissions") THEN 'tasks:edit_all' END,
        CASE WHEN 'dashboard:read' = ANY("permissions") THEN 'dashboard:read_all' END,
        CASE WHEN 'activity:read' = ANY("permissions") THEN 'activity:read_all' END
      ]) AS x WHERE x IS NOT NULL)),
    "updatedAt" = now()
WHERE "isSystem" = false;
