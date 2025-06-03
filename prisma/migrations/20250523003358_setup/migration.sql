-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN     "setupCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "setupCompletedAt" TIMESTAMP(3);
