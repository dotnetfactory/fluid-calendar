-- CreateEnum
CREATE TYPE "ArticleClusterType" AS ENUM ('use_case', 'productivity_tip', 'feature_guide', 'comparison', 'integration', 'industry', 'role', 'problem_solution', 'best_practice', 'seasonal', 'template', 'long_tail');

-- CreateEnum
CREATE TYPE "ArticleClusterStatus" AS ENUM ('pending', 'generating', 'published', 'needs_review', 'failed', 'skipped');

-- CreateEnum
CREATE TYPE "AICallType" AS ENUM ('SEO_CONTENT_GENERATION', 'OTHER');

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleCluster" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metaDescription" TEXT NOT NULL,
    "clusterType" "ArticleClusterType" NOT NULL,
    "status" "ArticleClusterStatus" NOT NULL DEFAULT 'pending',
    "priorityScore" INTEGER NOT NULL DEFAULT 50,
    "useCase" TEXT,
    "targetAudience" TEXT,
    "competitor" TEXT,
    "industry" TEXT,
    "role" TEXT,
    "provider" TEXT,
    "focusArea" TEXT,
    "scenario" TEXT,
    "keywords" TEXT,
    "articleId" TEXT,
    "generationAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastGenerationAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleGenerationLog" (
    "id" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "cost" DOUBLE PRECISION,
    "wordCount" INTEGER,
    "errorMessage" TEXT,
    "metadata" JSONB,

    CONSTRAINT "ArticleGenerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AICallLog" (
    "id" TEXT NOT NULL,
    "type" "AICallType" NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AICallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_slug_idx" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_published_idx" ON "Article"("published");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleCluster_slug_key" ON "ArticleCluster"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleCluster_articleId_key" ON "ArticleCluster"("articleId");

-- CreateIndex
CREATE INDEX "ArticleCluster_status_priorityScore_idx" ON "ArticleCluster"("status", "priorityScore");

-- CreateIndex
CREATE INDEX "ArticleCluster_clusterType_idx" ON "ArticleCluster"("clusterType");

-- CreateIndex
CREATE INDEX "ArticleGenerationLog_clusterId_idx" ON "ArticleGenerationLog"("clusterId");

-- CreateIndex
CREATE INDEX "ArticleGenerationLog_startedAt_idx" ON "ArticleGenerationLog"("startedAt");

-- CreateIndex
CREATE INDEX "AICallLog_type_idx" ON "AICallLog"("type");

-- CreateIndex
CREATE INDEX "AICallLog_model_idx" ON "AICallLog"("model");

-- CreateIndex
CREATE INDEX "AICallLog_createdAt_idx" ON "AICallLog"("createdAt");

-- AddForeignKey
ALTER TABLE "ArticleCluster" ADD CONSTRAINT "ArticleCluster_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleGenerationLog" ADD CONSTRAINT "ArticleGenerationLog_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "ArticleCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
