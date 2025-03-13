-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'FAILED', 'DELAYED', 'PAUSED');

-- CreateTable
CREATE TABLE "JobRecord" (
    "id" TEXT NOT NULL,
    "queueName" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "userId" TEXT,

    CONSTRAINT "JobRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobRecord_status_idx" ON "JobRecord"("status");

-- CreateIndex
CREATE INDEX "JobRecord_queueName_idx" ON "JobRecord"("queueName");

-- CreateIndex
CREATE INDEX "JobRecord_userId_idx" ON "JobRecord"("userId");

-- CreateIndex
CREATE INDEX "JobRecord_createdAt_idx" ON "JobRecord"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobRecord_queueName_jobId_key" ON "JobRecord"("queueName", "jobId");

-- AddForeignKey
ALTER TABLE "JobRecord" ADD CONSTRAINT "JobRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
