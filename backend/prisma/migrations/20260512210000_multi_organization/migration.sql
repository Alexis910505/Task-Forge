-- Multi-organization: tenant root + organizationId on tenant tables.
-- Default org id (stable for migration scripts):
--   org_default_taskforge

CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "accentColor" TEXT,
    "customCss" TEXT,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

INSERT INTO "Organization" ("id", "name", "slug", "createdAt", "updatedAt")
VALUES ('org_default_taskforge', 'Default', 'default', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Role: scope by organization
ALTER TABLE "Role" ADD COLUMN "organizationId" TEXT;
UPDATE "Role" SET "organizationId" = 'org_default_taskforge';
ALTER TABLE "Role" ALTER COLUMN "organizationId" SET NOT NULL;
DROP INDEX IF EXISTS "Role_name_key";
CREATE UNIQUE INDEX "Role_organizationId_name_key" ON "Role"("organizationId", "name");
CREATE INDEX "Role_organizationId_idx" ON "Role"("organizationId");
ALTER TABLE "Role" ADD CONSTRAINT "Role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- User
ALTER TABLE "User" ADD COLUMN "organizationId" TEXT;
UPDATE "User" SET "organizationId" = 'org_default_taskforge';
ALTER TABLE "User" ALTER COLUMN "organizationId" SET NOT NULL;
DROP INDEX IF EXISTS "User_email_key";
CREATE UNIQUE INDEX "User_organizationId_email_key" ON "User"("organizationId", "email");
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Department
ALTER TABLE "Department" ADD COLUMN "organizationId" TEXT;
UPDATE "Department" SET "organizationId" = 'org_default_taskforge';
ALTER TABLE "Department" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE INDEX "Department_organizationId_idx" ON "Department"("organizationId");
ALTER TABLE "Department" ADD CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Team
ALTER TABLE "Team" ADD COLUMN "organizationId" TEXT;
UPDATE "Team" t SET "organizationId" = COALESCE(
  (SELECT d."organizationId" FROM "Department" d WHERE d.id = t."departmentId"),
  'org_default_taskforge'
);
ALTER TABLE "Team" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE INDEX "Team_organizationId_idx" ON "Team"("organizationId");
ALTER TABLE "Team" ADD CONSTRAINT "Team_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Project
ALTER TABLE "Project" ADD COLUMN "organizationId" TEXT;
UPDATE "Project" p SET "organizationId" = COALESCE(
  (SELECT d."organizationId" FROM "Department" d WHERE d.id = p."departmentId"),
  'org_default_taskforge'
);
ALTER TABLE "Project" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Board
ALTER TABLE "Board" ADD COLUMN "organizationId" TEXT;
UPDATE "Board" b SET "organizationId" = (SELECT p."organizationId" FROM "Project" p WHERE p.id = b."projectId");
ALTER TABLE "Board" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE INDEX "Board_organizationId_idx" ON "Board"("organizationId");
ALTER TABLE "Board" ADD CONSTRAINT "Board_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Asset
ALTER TABLE "Asset" ADD COLUMN "organizationId" TEXT;
UPDATE "Asset" SET "organizationId" = 'org_default_taskforge';
ALTER TABLE "Asset" ALTER COLUMN "organizationId" SET NOT NULL;
DROP INDEX IF EXISTS "Asset_code_key";
CREATE UNIQUE INDEX "Asset_organizationId_code_key" ON "Asset"("organizationId", "code");
CREATE INDEX "Asset_organizationId_idx" ON "Asset"("organizationId");
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ActivityLog
ALTER TABLE "ActivityLog" ADD COLUMN "organizationId" TEXT;
UPDATE "ActivityLog" al SET "organizationId" = (
  SELECT p."organizationId"
  FROM "Task" t
  INNER JOIN "Board" b ON b.id = t."boardId"
  INNER JOIN "Project" p ON p.id = b."projectId"
  WHERE t.id = al."taskId"
)
WHERE al."taskId" IS NOT NULL;
CREATE INDEX "ActivityLog_organizationId_idx" ON "ActivityLog"("organizationId");
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
