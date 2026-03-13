-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN     "logDestination" TEXT NOT NULL DEFAULT 'db',
ADD COLUMN     "logRetention" JSONB;

-- CreateTable
CREATE TABLE "Log" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "source" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Log_timestamp_level_idx" ON "Log"("timestamp", "level");

-- CreateIndex
CREATE INDEX "Log_expiresAt_idx" ON "Log"("expiresAt");

-- CreateIndex
CREATE INDEX "Log_source_level_idx" ON "Log"("source", "level");
