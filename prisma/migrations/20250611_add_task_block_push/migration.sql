-- Add task block push fields to Task model
ALTER TABLE "Task" ADD COLUMN "blockEventId" TEXT;
ALTER TABLE "Task" ADD COLUMN "blockDirty" BOOLEAN NOT NULL DEFAULT false;

-- Add calendar push settings to AutoScheduleSettings model
ALTER TABLE "AutoScheduleSettings" ADD COLUMN "pushTasksToCalendar" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AutoScheduleSettings" ADD COLUMN "pushTasksFeedId" TEXT;

-- Add index for blockDirty to optimize queries for repush
CREATE INDEX "Task_blockDirty_userId_idx" ON "Task"("blockDirty", "userId");
