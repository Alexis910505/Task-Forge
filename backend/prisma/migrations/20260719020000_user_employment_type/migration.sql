-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('PART_TIME', 'FULL_TIME', 'FULL_TIME_SEASONAL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME';
