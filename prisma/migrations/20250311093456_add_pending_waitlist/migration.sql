-- CreateTable
CREATE TABLE "PendingWaitlist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "referralCode" TEXT,
    "verificationToken" TEXT NOT NULL,
    "verificationExpiry" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingWaitlist_email_key" ON "PendingWaitlist"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PendingWaitlist_verificationToken_key" ON "PendingWaitlist"("verificationToken");

-- CreateIndex
CREATE INDEX "PendingWaitlist_verificationToken_idx" ON "PendingWaitlist"("verificationToken");

-- CreateIndex
CREATE INDEX "PendingWaitlist_email_idx" ON "PendingWaitlist"("email");
