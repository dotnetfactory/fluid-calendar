-- AlterTable
ALTER TABLE "Task" ADD COLUMN "priority" TEXT;

-- CreateIndex
CREATE INDEX "Task_priority_idx" ON "Task"("priority");
