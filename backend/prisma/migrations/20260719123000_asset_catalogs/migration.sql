-- Catálogos administrables de categorías y estados de activos.
CREATE TABLE "AssetCategoryOption" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6750A4',
    "icon" TEXT NOT NULL DEFAULT 'inventory_2',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetCategoryOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetStatusOption" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6750A4',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetStatusOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssetCategoryOption_organizationId_code_key"
    ON "AssetCategoryOption"("organizationId", "code");
CREATE INDEX "AssetCategoryOption_organizationId_sortOrder_idx"
    ON "AssetCategoryOption"("organizationId", "sortOrder");
CREATE UNIQUE INDEX "AssetStatusOption_organizationId_code_key"
    ON "AssetStatusOption"("organizationId", "code");
CREATE INDEX "AssetStatusOption_organizationId_sortOrder_idx"
    ON "AssetStatusOption"("organizationId", "sortOrder");

ALTER TABLE "AssetCategoryOption"
    ADD CONSTRAINT "AssetCategoryOption_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetStatusOption"
    ADD CONSTRAINT "AssetStatusOption_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Los activos conservan sus códigos actuales, ahora como texto.
ALTER TABLE "Asset" ALTER COLUMN "category" TYPE TEXT USING "category"::TEXT;
ALTER TABLE "Asset" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Asset" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
ALTER TABLE "Asset" ALTER COLUMN "status" SET DEFAULT 'OPERATIONAL';

-- Catálogos predeterminados para todas las organizaciones existentes.
INSERT INTO "AssetCategoryOption"
    ("id", "organizationId", "code", "name", "color", "icon", "isDefault", "sortOrder", "updatedAt")
SELECT
    'cat_' || md5(o.id || v.code),
    o.id,
    v.code,
    v.name,
    v.color,
    v.icon,
    v."isDefault",
    v."sortOrder",
    CURRENT_TIMESTAMP
FROM "Organization" o
CROSS JOIN (
    VALUES
      ('VEHICLE', 'Vehículo', '#1565C0', 'directions_car', false, 10),
      ('TOOL', 'Herramienta', '#6D4C41', 'handyman', false, 20),
      ('EQUIPMENT', 'Equipo', '#6750A4', 'inventory_2', true, 30),
      ('MACHINERY', 'Maquinaria', '#EF6C00', 'precision_manufacturing', false, 40),
      ('BUILDING', 'Edificio', '#455A64', 'domain', false, 50),
      ('ROOM', 'Sala', '#00838F', 'meeting_room', false, 60),
      ('ELECTRICAL', 'Eléctrico', '#F9A825', 'electric_bolt', false, 70),
      ('HVAC', 'Climatización', '#0277BD', 'ac_unit', false, 80),
      ('OTHER', 'Otro', '#616161', 'category', false, 90)
) AS v(code, name, color, icon, "isDefault", "sortOrder");

INSERT INTO "AssetStatusOption"
    ("id", "organizationId", "code", "name", "color", "isDefault", "sortOrder", "updatedAt")
SELECT
    'ast_' || md5(o.id || v.code),
    o.id,
    v.code,
    v.name,
    v.color,
    v."isDefault",
    v."sortOrder",
    CURRENT_TIMESTAMP
FROM "Organization" o
CROSS JOIN (
    VALUES
      ('OPERATIONAL', 'Operativo', '#2E7D32', true, 10),
      ('MAINTENANCE', 'Mantenimiento', '#ED6C02', false, 20),
      ('OFFLINE', 'Fuera de servicio', '#D32F2F', false, 30),
      ('RESERVED', 'Reservado', '#6750A4', false, 40),
      ('RETIRED', 'Retirado', '#616161', false, 50)
) AS v(code, name, color, "isDefault", "sortOrder");

DROP TYPE "AssetCategory";
DROP TYPE "AssetStatus";
