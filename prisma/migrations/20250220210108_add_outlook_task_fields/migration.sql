-- AlterTable
ALTER TABLE "Task" ADD COLUMN "externalTaskId" TEXT;
ALTER TABLE "Task" ADD COLUMN "lastSyncedAt" DATETIME;
ALTER TABLE "Task" ADD COLUMN "source" TEXT;

-- CreateTable
CREATE TABLE "OutlookTaskListMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalListId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "lastImported" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "OutlookTaskListMapping_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "OutlookTaskListMapping_externalListId_key" ON "OutlookTaskListMapping"("externalListId");

-- CreateIndex
CREATE INDEX "OutlookTaskListMapping_externalListId_idx" ON "OutlookTaskListMapping"("externalListId");

-- CreateIndex
CREATE INDEX "OutlookTaskListMapping_projectId_idx" ON "OutlookTaskListMapping"("projectId");

-- CreateIndex
CREATE INDEX "Task_externalTaskId_idx" ON "Task"("externalTaskId");

-- CreateIndex
CREATE INDEX "Task_source_idx" ON "Task"("source");
