-- Sesiones por dispositivo (web/móvil concurrentes)
ALTER TABLE "RefreshToken" ADD COLUMN "clientId" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN "platform" TEXT;

CREATE INDEX "RefreshToken_userId_clientId_idx" ON "RefreshToken"("userId", "clientId");
