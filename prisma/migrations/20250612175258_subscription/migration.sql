/*
  Warnings:

  - A unique constraint covering the columns `[stripeSubscriptionId]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubscriptionPlan" ADD VALUE 'BASIC_MONTHLY';
ALTER TYPE "SubscriptionPlan" ADD VALUE 'BASIC_YEARLY';
ALTER TYPE "SubscriptionPlan" ADD VALUE 'PRO_MONTHLY';
ALTER TYPE "SubscriptionPlan" ADD VALUE 'PRO_YEARLY';
ALTER TYPE "SubscriptionPlan" ADD VALUE 'ADVANCED_MONTHLY';
ALTER TYPE "SubscriptionPlan" ADD VALUE 'ADVANCED_YEARLY';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubscriptionStatus" ADD VALUE 'TRIALING';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'PAST_DUE';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'UNPAID';

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "calendarProviderLimit" INTEGER,
ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "currency" TEXT DEFAULT 'usd',
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "currentPeriodStart" TIMESTAMP(3),
ADD COLUMN     "stripePriceId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "trialEnd" TIMESTAMP(3),
ADD COLUMN     "trialStart" TIMESTAMP(3),
ALTER COLUMN "plan" DROP DEFAULT;

-- CreateTable
CREATE TABLE "SubscriptionPlanConfig" (
    "id" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "stripePriceId" TEXT,
    "stripeProductId" TEXT,
    "calendarProviderLimit" INTEGER,
    "features" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "trialDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlanConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "fromStatus" "SubscriptionStatus",
    "toStatus" "SubscriptionStatus" NOT NULL,
    "fromPlan" "SubscriptionPlan",
    "toPlan" "SubscriptionPlan" NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "calendarProvidersUsed" INTEGER NOT NULL DEFAULT 0,
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlanConfig_plan_key" ON "SubscriptionPlanConfig"("plan");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlanConfig_stripePriceId_key" ON "SubscriptionPlanConfig"("stripePriceId");

-- CreateIndex
CREATE INDEX "SubscriptionPlanConfig_plan_idx" ON "SubscriptionPlanConfig"("plan");

-- CreateIndex
CREATE INDEX "SubscriptionPlanConfig_isActive_sortOrder_idx" ON "SubscriptionPlanConfig"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "SubscriptionHistory_userId_idx" ON "SubscriptionHistory"("userId");

-- CreateIndex
CREATE INDEX "SubscriptionHistory_subscriptionId_idx" ON "SubscriptionHistory"("subscriptionId");

-- CreateIndex
CREATE INDEX "SubscriptionHistory_createdAt_idx" ON "SubscriptionHistory"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionUsage_userId_key" ON "SubscriptionUsage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionUsage_subscriptionId_key" ON "SubscriptionUsage"("subscriptionId");

-- CreateIndex
CREATE INDEX "SubscriptionUsage_userId_idx" ON "SubscriptionUsage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_plan_idx" ON "Subscription"("plan");

-- CreateIndex
CREATE INDEX "Subscription_stripeSubscriptionId_idx" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_currentPeriodEnd_idx" ON "Subscription"("currentPeriodEnd");

-- AddForeignKey
ALTER TABLE "SubscriptionHistory" ADD CONSTRAINT "SubscriptionHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionHistory" ADD CONSTRAINT "SubscriptionHistory_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionUsage" ADD CONSTRAINT "SubscriptionUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionUsage" ADD CONSTRAINT "SubscriptionUsage_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
