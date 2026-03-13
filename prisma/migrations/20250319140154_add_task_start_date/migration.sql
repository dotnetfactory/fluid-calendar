-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "startDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Task_startDate_idx" ON "Task"("startDate");
