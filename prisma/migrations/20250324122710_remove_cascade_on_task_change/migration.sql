-- DropForeignKey
ALTER TABLE "TaskChange" DROP CONSTRAINT "TaskChange_taskId_fkey";

-- AddForeignKey
ALTER TABLE "TaskChange" ADD CONSTRAINT "TaskChange_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
