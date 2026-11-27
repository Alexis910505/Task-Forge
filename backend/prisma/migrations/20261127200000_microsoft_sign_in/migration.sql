-- AlterTable
ALTER TABLE "User" ADD COLUMN     "inviteExpiresAt" TIMESTAMP(3),
ADD COLUMN     "inviteTokenHash" TEXT,
ADD COLUMN     "microsoftOid" TEXT,
ADD COLUMN     "microsoftTenantId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteTokenHash_key" ON "User"("inviteTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "User_organizationId_microsoftOid_key" ON "User"("organizationId", "microsoftOid");

