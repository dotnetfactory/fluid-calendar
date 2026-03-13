/*
  Warnings:

  - A unique constraint covering the columns `[externalListId,projectId]` on the table `OutlookTaskListMapping` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "OutlookTaskListMapping_externalListId_key";

-- CreateIndex
CREATE UNIQUE INDEX "OutlookTaskListMapping_externalListId_projectId_key" ON "OutlookTaskListMapping"("externalListId", "projectId");
