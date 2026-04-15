-- AlterTable
ALTER TABLE "CalendarSettings" ADD COLUMN     "allDayMaxEvents" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "slotDuration" INTEGER NOT NULL DEFAULT 30;
