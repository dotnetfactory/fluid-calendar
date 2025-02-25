-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "postponedUntil" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Task_postponedUntil_idx" ON "Task"("postponedUntil");
