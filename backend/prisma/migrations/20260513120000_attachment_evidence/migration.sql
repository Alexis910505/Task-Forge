-- CreateEnum
CREATE TYPE "EvidenceKind" AS ENUM ('BEFORE', 'AFTER');

-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "evidenceKind" "EvidenceKind",
ADD COLUMN     "capturedAt" TIMESTAMP(3),
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;
