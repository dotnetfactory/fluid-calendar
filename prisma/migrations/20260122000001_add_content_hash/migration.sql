-- =============================================
-- FIX: ArticleCluster missing columns
-- =============================================
ALTER TABLE "ArticleCluster" ADD COLUMN IF NOT EXISTS "contentHash" TEXT;
ALTER TABLE "ArticleCluster" ADD COLUMN IF NOT EXISTS "metadata" TEXT;
ALTER TABLE "ArticleCluster" DROP COLUMN IF EXISTS "lastGenerationAt";

-- =============================================
-- FIX: ArticleGenerationLog - add missing columns, remove extras
-- =============================================
-- Add missing columns from schema
ALTER TABLE "ArticleGenerationLog" ADD COLUMN IF NOT EXISTS "errorStack" TEXT;
ALTER TABLE "ArticleGenerationLog" ADD COLUMN IF NOT EXISTS "emailSent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ArticleGenerationLog" ADD COLUMN IF NOT EXISTS "emailError" TEXT;

-- Remove columns not in schema (they were wrongly added)
ALTER TABLE "ArticleGenerationLog" DROP COLUMN IF EXISTS "inputTokens";
ALTER TABLE "ArticleGenerationLog" DROP COLUMN IF EXISTS "outputTokens";
ALTER TABLE "ArticleGenerationLog" DROP COLUMN IF EXISTS "cost";
ALTER TABLE "ArticleGenerationLog" DROP COLUMN IF EXISTS "metadata";

-- =============================================
-- FIX: AICallLog - completely restructure to match schema
-- =============================================
-- Add missing columns
ALTER TABLE "AICallLog" ADD COLUMN IF NOT EXISTS "startTime" TIMESTAMP(3);
ALTER TABLE "AICallLog" ADD COLUMN IF NOT EXISTS "endTime" TIMESTAMP(3);
ALTER TABLE "AICallLog" ADD COLUMN IF NOT EXISTS "prompt" TEXT;
ALTER TABLE "AICallLog" ADD COLUMN IF NOT EXISTS "response" TEXT;
ALTER TABLE "AICallLog" ADD COLUMN IF NOT EXISTS "error" TEXT;

-- Rename columns (if they exist with old names)
DO $$
BEGIN
    -- Rename inputTokens -> tokensPrompt
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AICallLog' AND column_name='inputTokens') THEN
        ALTER TABLE "AICallLog" RENAME COLUMN "inputTokens" TO "tokensPrompt";
    END IF;

    -- Rename outputTokens -> tokensCompletion
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AICallLog' AND column_name='outputTokens') THEN
        ALTER TABLE "AICallLog" RENAME COLUMN "outputTokens" TO "tokensCompletion";
    END IF;

    -- Rename totalTokens -> tokensTotal
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AICallLog' AND column_name='totalTokens') THEN
        ALTER TABLE "AICallLog" RENAME COLUMN "totalTokens" TO "tokensTotal";
    END IF;

    -- Rename cost -> costUsd
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AICallLog' AND column_name='cost') THEN
        ALTER TABLE "AICallLog" RENAME COLUMN "cost" TO "costUsd";
    END IF;

    -- Rename errorMessage -> error (if error doesn't exist yet)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AICallLog' AND column_name='errorMessage')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AICallLog' AND column_name='error') THEN
        ALTER TABLE "AICallLog" RENAME COLUMN "errorMessage" TO "error";
    END IF;
END $$;

-- Make columns nullable as per schema
ALTER TABLE "AICallLog" ALTER COLUMN "tokensPrompt" DROP NOT NULL;
ALTER TABLE "AICallLog" ALTER COLUMN "tokensCompletion" DROP NOT NULL;
ALTER TABLE "AICallLog" ALTER COLUMN "tokensTotal" DROP NOT NULL;
ALTER TABLE "AICallLog" ALTER COLUMN "costUsd" DROP NOT NULL;
ALTER TABLE "AICallLog" ALTER COLUMN "durationMs" DROP NOT NULL;

-- Change metadata from JSONB to TEXT (drop and recreate)
ALTER TABLE "AICallLog" DROP COLUMN IF EXISTS "metadata";
ALTER TABLE "AICallLog" ADD COLUMN "metadata" TEXT;

-- Remove success column (not in schema)
ALTER TABLE "AICallLog" DROP COLUMN IF EXISTS "success";

-- Set default for startTime from createdAt for existing records
UPDATE "AICallLog" SET "startTime" = "createdAt" WHERE "startTime" IS NULL;
