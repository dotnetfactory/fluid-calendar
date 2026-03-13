-- CreateTable
CREATE TABLE "TaskChange" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "providerId" TEXT,
    "mappingId" TEXT,
    "changeType" TEXT NOT NULL,
    "changeData" JSONB,
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskChange_taskId_idx" ON "TaskChange"("taskId");

-- CreateIndex
CREATE INDEX "TaskChange_providerId_idx" ON "TaskChange"("providerId");

-- CreateIndex
CREATE INDEX "TaskChange_mappingId_idx" ON "TaskChange"("mappingId");

-- CreateIndex
CREATE INDEX "TaskChange_changeType_idx" ON "TaskChange"("changeType");

-- CreateIndex
CREATE INDEX "TaskChange_synced_idx" ON "TaskChange"("synced");

-- CreateIndex
CREATE INDEX "TaskChange_timestamp_idx" ON "TaskChange"("timestamp");

-- CreateIndex
CREATE INDEX "TaskChange_userId_idx" ON "TaskChange"("userId");

-- AddForeignKey
ALTER TABLE "TaskChange" ADD CONSTRAINT "TaskChange_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskChange" ADD CONSTRAINT "TaskChange_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "TaskProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskChange" ADD CONSTRAINT "TaskChange_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "TaskListMapping"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskChange" ADD CONSTRAINT "TaskChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
