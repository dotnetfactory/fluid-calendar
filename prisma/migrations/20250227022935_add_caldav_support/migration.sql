-- AlterTable
ALTER TABLE "CalendarFeed" ADD COLUMN     "caldavPath" TEXT,
ADD COLUMN     "ctag" TEXT;

-- AlterTable
ALTER TABLE "ConnectedAccount" ADD COLUMN     "caldavUrl" TEXT,
ADD COLUMN     "caldavUsername" TEXT;
