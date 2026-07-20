ALTER TABLE "Role"
  ADD COLUMN "nameEs" TEXT,
  ADD COLUMN "nameEn" TEXT;

-- Los roles personalizados existentes conservan su nombre en ambos idiomas
-- hasta que un administrador complete su traducción.
UPDATE "Role"
SET "nameEs" = "name", "nameEn" = "name"
WHERE "isSystem" = false;
