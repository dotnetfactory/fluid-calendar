-- AlterTable
ALTER TABLE "PendingWaitlist" ADD COLUMN     "interestedInLifetime" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Waitlist" ADD COLUMN     "interestedInLifetime" BOOLEAN NOT NULL DEFAULT false;
