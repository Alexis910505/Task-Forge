-- CreateTable
CREATE TABLE "Routine" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "personal" BOOLEAN NOT NULL DEFAULT true,
    "ownerId" TEXT NOT NULL,
    "weekdays" INTEGER[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Routine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineItem" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoutineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineAssignee" (
    "routineId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "RoutineAssignee_pkey" PRIMARY KEY ("routineId","userId")
);

-- CreateTable
CREATE TABLE "RoutineRun" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "totalItems" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutineRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineRunCheck" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "itemId" TEXT,
    "itemTitle" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoutineRunCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Routine_organizationId_idx" ON "Routine"("organizationId");

-- CreateIndex
CREATE INDEX "Routine_ownerId_idx" ON "Routine"("ownerId");

-- CreateIndex
CREATE INDEX "RoutineItem_routineId_idx" ON "RoutineItem"("routineId");

-- CreateIndex
CREATE INDEX "RoutineAssignee_userId_idx" ON "RoutineAssignee"("userId");

-- CreateIndex
CREATE INDEX "RoutineRun_userId_date_idx" ON "RoutineRun"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RoutineRun_routineId_userId_date_key" ON "RoutineRun"("routineId", "userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RoutineRunCheck_runId_itemId_key" ON "RoutineRunCheck"("runId", "itemId");

-- AddForeignKey
ALTER TABLE "Routine" ADD CONSTRAINT "Routine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Routine" ADD CONSTRAINT "Routine_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineItem" ADD CONSTRAINT "RoutineItem_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineAssignee" ADD CONSTRAINT "RoutineAssignee_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineAssignee" ADD CONSTRAINT "RoutineAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineRun" ADD CONSTRAINT "RoutineRun_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineRun" ADD CONSTRAINT "RoutineRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineRunCheck" ADD CONSTRAINT "RoutineRunCheck_runId_fkey" FOREIGN KEY ("runId") REFERENCES "RoutineRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineRunCheck" ADD CONSTRAINT "RoutineRunCheck_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "RoutineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

