-- AlterTable
ALTER TABLE "CalendarFeed" ADD COLUMN     "autoSync" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "syncInterval" INTEGER NOT NULL DEFAULT 5;
