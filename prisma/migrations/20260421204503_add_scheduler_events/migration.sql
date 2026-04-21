-- CreateTable
CREATE TABLE "SchedulerEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schedulerVersion" TEXT NOT NULL,
    "taskId" TEXT,
    "payload" JSONB NOT NULL,

    CONSTRAINT "SchedulerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFeedbackState" (
    "userId" TEXT NOT NULL,
    "feedbackEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dailyAskCount" INTEGER NOT NULL DEFAULT 0,
    "lastAskDate" TIMESTAMP(3),
    "consecutiveSkips" INTEGER NOT NULL DEFAULT 0,
    "dampenedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFeedbackState_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "SchedulerEvent_userId_eventType_occurredAt_idx" ON "SchedulerEvent"("userId", "eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "SchedulerEvent_taskId_occurredAt_idx" ON "SchedulerEvent"("taskId", "occurredAt");

-- CreateIndex
CREATE INDEX "SchedulerEvent_occurredAt_idx" ON "SchedulerEvent"("occurredAt");

-- AddForeignKey
ALTER TABLE "SchedulerEvent" ADD CONSTRAINT "SchedulerEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFeedbackState" ADD CONSTRAINT "UserFeedbackState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
