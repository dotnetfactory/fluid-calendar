-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalSource" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "externalCreatedAt" TIMESTAMP(3),
ADD COLUMN     "externalListId" TEXT,
ADD COLUMN     "externalUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "skipSync" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "syncError" TEXT,
ADD COLUMN     "syncHash" TEXT,
ADD COLUMN     "syncStatus" TEXT;

-- CreateTable
CREATE TABLE "TaskProvider" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "syncInterval" TEXT NOT NULL DEFAULT 'hourly',
    "lastSyncedAt" TIMESTAMP(3),
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "settings" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskListMapping" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "externalListId" TEXT NOT NULL,
    "externalListName" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'incoming',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isAutoScheduled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskListMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskProvider_userId_idx" ON "TaskProvider"("userId");

-- CreateIndex
CREATE INDEX "TaskProvider_type_idx" ON "TaskProvider"("type");

-- CreateIndex
CREATE UNIQUE INDEX "TaskProvider_userId_type_key" ON "TaskProvider"("userId", "type");

-- CreateIndex
CREATE INDEX "TaskListMapping_providerId_idx" ON "TaskListMapping"("providerId");

-- CreateIndex
CREATE INDEX "TaskListMapping_projectId_idx" ON "TaskListMapping"("projectId");

-- CreateIndex
CREATE INDEX "TaskListMapping_externalListId_idx" ON "TaskListMapping"("externalListId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskListMapping_providerId_projectId_key" ON "TaskListMapping"("providerId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskListMapping_providerId_externalListId_key" ON "TaskListMapping"("providerId", "externalListId");

-- CreateIndex
CREATE INDEX "Project_externalId_externalSource_idx" ON "Project"("externalId", "externalSource");

-- CreateIndex
CREATE INDEX "Task_externalTaskId_source_idx" ON "Task"("externalTaskId", "source");

-- CreateIndex
CREATE INDEX "Task_syncStatus_idx" ON "Task"("syncStatus");

-- CreateIndex
CREATE INDEX "Task_externalListId_idx" ON "Task"("externalListId");

-- AddForeignKey
ALTER TABLE "TaskProvider" ADD CONSTRAINT "TaskProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskListMapping" ADD CONSTRAINT "TaskListMapping_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "TaskProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskListMapping" ADD CONSTRAINT "TaskListMapping_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
