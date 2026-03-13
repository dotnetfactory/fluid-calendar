-- Drop and recreate AICallLog and ArticleGenerationLog with correct schema
-- These tables have no important data yet

-- Drop ArticleGenerationLog first (has FK to ArticleCluster)
DROP TABLE IF EXISTS "ArticleGenerationLog";

-- Drop AICallLog
DROP TABLE IF EXISTS "AICallLog";

-- Recreate AICallLog with correct schema
CREATE TABLE "AICallLog" (
    "id" TEXT NOT NULL,
    "type" "AICallType" NOT NULL,
    "model" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "durationMs" INTEGER,
    "prompt" TEXT,
    "response" TEXT,
    "tokensPrompt" INTEGER,
    "tokensCompletion" INTEGER,
    "tokensTotal" INTEGER,
    "costUsd" DOUBLE PRECISION,
    "metadata" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AICallLog_pkey" PRIMARY KEY ("id")
);

-- Recreate ArticleGenerationLog with correct schema
CREATE TABLE "ArticleGenerationLog" (
    "id" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "wordCount" INTEGER,
    "errorMessage" TEXT,
    "errorStack" TEXT,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailError" TEXT,

    CONSTRAINT "ArticleGenerationLog_pkey" PRIMARY KEY ("id")
);

-- Recreate indexes
CREATE INDEX "AICallLog_type_idx" ON "AICallLog"("type");
CREATE INDEX "AICallLog_model_idx" ON "AICallLog"("model");
CREATE INDEX "AICallLog_createdAt_idx" ON "AICallLog"("createdAt");

CREATE INDEX "ArticleGenerationLog_clusterId_idx" ON "ArticleGenerationLog"("clusterId");
CREATE INDEX "ArticleGenerationLog_startedAt_idx" ON "ArticleGenerationLog"("startedAt");

-- Recreate foreign key
ALTER TABLE "ArticleGenerationLog" ADD CONSTRAINT "ArticleGenerationLog_clusterId_fkey"
    FOREIGN KEY ("clusterId") REFERENCES "ArticleCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Remove lastGenerationAt from ArticleCluster if it exists
ALTER TABLE "ArticleCluster" DROP COLUMN IF EXISTS "lastGenerationAt";
