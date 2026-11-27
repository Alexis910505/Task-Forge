-- CreateEnum
CREATE TYPE "TaskRecurrence" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "nextOccurrenceAt" TIMESTAMP(3),
ADD COLUMN     "occurrence" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "recurrence" "TaskRecurrence",
ADD COLUMN     "seriesId" TEXT,
ADD COLUMN     "spawnedNextId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Task_spawnedNextId_key" ON "Task"("spawnedNextId");

-- CreateIndex
CREATE INDEX "Task_nextOccurrenceAt_idx" ON "Task"("nextOccurrenceAt");

-- CreateIndex
CREATE UNIQUE INDEX "Task_seriesId_occurrence_key" ON "Task"("seriesId", "occurrence");

-- Tareas ya completadas: usar la última actualización como fecha de finalización.
UPDATE "Task" SET "completedAt" = "updatedAt" WHERE "status" = 'COMPLETED' AND "completedAt" IS NULL;
