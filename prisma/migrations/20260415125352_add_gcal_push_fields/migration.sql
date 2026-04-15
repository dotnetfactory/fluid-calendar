-- AlterTable
ALTER TABLE "CalendarSettings" ADD COLUMN     "taskCalendarId" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "gcalEventId" TEXT,
ADD COLUMN     "gcalFeedId" TEXT,
ADD COLUMN     "gcalSyncStatus" TEXT;

-- CreateIndex
CREATE INDEX "Task_gcalEventId_idx" ON "Task"("gcalEventId");
