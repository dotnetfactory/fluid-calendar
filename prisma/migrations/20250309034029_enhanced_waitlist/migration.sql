-- AlterTable
ALTER TABLE "Waitlist" ADD COLUMN     "invitationExpiry" TIMESTAMP(3),
ADD COLUMN     "invitationToken" TEXT,
ADD COLUMN     "invitedAt" TIMESTAMP(3),
ADD COLUMN     "lastVisitedAt" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "priorityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referralCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "referredBy" TEXT,
ADD COLUMN     "registeredAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT DEFAULT 'WAITING';

-- CreateTable
CREATE TABLE "BetaSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "maxActiveUsers" INTEGER NOT NULL DEFAULT 100,
    "invitationValidDays" INTEGER NOT NULL DEFAULT 7,
    "autoInviteEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoInviteCount" INTEGER NOT NULL DEFAULT 10,
    "autoInviteFrequency" TEXT NOT NULL DEFAULT 'WEEKLY',
    "referralBoostAmount" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "maxReferralBoost" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "showQueuePosition" BOOLEAN NOT NULL DEFAULT true,
    "showTotalWaitlist" BOOLEAN NOT NULL DEFAULT true,
    "invitationEmailTemplate" TEXT NOT NULL DEFAULT '',
    "waitlistConfirmationTemplate" TEXT NOT NULL DEFAULT '',
    "reminderEmailTemplate" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "BetaSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Waitlist_status_idx" ON "Waitlist"("status");

-- CreateIndex
CREATE INDEX "Waitlist_referredBy_idx" ON "Waitlist"("referredBy");

-- CreateIndex
CREATE INDEX "Waitlist_priorityScore_idx" ON "Waitlist"("priorityScore");
