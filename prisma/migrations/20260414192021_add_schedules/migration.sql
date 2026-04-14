-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "scheduleId" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "scheduleId" TEXT;

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "selectedCalendars" TEXT NOT NULL DEFAULT '[]',
    "bufferMinutes" INTEGER NOT NULL DEFAULT 15,
    "highEnergyStart" INTEGER,
    "highEnergyEnd" INTEGER,
    "mediumEnergyStart" INTEGER,
    "mediumEnergyEnd" INTEGER,
    "lowEnergyStart" INTEGER,
    "lowEnergyEnd" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleTimeBlock" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startHour" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL DEFAULT 0,
    "endHour" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ScheduleTimeBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Schedule_userId_idx" ON "Schedule"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_userId_name_key" ON "Schedule"("userId", "name");

-- CreateIndex
CREATE INDEX "ScheduleTimeBlock_scheduleId_dayOfWeek_idx" ON "ScheduleTimeBlock"("scheduleId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "Project_scheduleId_idx" ON "Project"("scheduleId");

-- CreateIndex
CREATE INDEX "Task_scheduleId_idx" ON "Task"("scheduleId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTimeBlock" ADD CONSTRAINT "ScheduleTimeBlock_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
