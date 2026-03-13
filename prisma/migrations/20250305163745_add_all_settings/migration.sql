-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "defaultView" TEXT NOT NULL DEFAULT 'week',
    "timeZone" TEXT NOT NULL,
    "weekStartDay" TEXT NOT NULL DEFAULT 'sunday',
    "timeFormat" TEXT NOT NULL DEFAULT '12h',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultCalendarId" TEXT,
    "workingHoursEnabled" BOOLEAN NOT NULL DEFAULT true,
    "workingHoursStart" TEXT NOT NULL DEFAULT '09:00',
    "workingHoursEnd" TEXT NOT NULL DEFAULT '17:00',
    "workingHoursDays" TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
    "defaultDuration" INTEGER NOT NULL DEFAULT 60,
    "defaultColor" TEXT NOT NULL DEFAULT '#3b82f6',
    "defaultReminder" INTEGER NOT NULL DEFAULT 30,
    "refreshInterval" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "eventInvites" BOOLEAN NOT NULL DEFAULT true,
    "eventUpdates" BOOLEAN NOT NULL DEFAULT true,
    "eventCancellations" BOOLEAN NOT NULL DEFAULT true,
    "eventReminders" BOOLEAN NOT NULL DEFAULT true,
    "defaultReminderTiming" TEXT NOT NULL DEFAULT '[30]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "googleCalendarEnabled" BOOLEAN NOT NULL DEFAULT true,
    "googleCalendarAutoSync" BOOLEAN NOT NULL DEFAULT true,
    "googleCalendarInterval" INTEGER NOT NULL DEFAULT 5,
    "outlookCalendarEnabled" BOOLEAN NOT NULL DEFAULT true,
    "outlookCalendarAutoSync" BOOLEAN NOT NULL DEFAULT true,
    "outlookCalendarInterval" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "autoBackup" BOOLEAN NOT NULL DEFAULT true,
    "backupInterval" INTEGER NOT NULL DEFAULT 7,
    "retainDataFor" INTEGER NOT NULL DEFAULT 365,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE INDEX "UserSettings_userId_idx" ON "UserSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSettings_userId_key" ON "CalendarSettings"("userId");

-- CreateIndex
CREATE INDEX "CalendarSettings_userId_idx" ON "CalendarSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSettings_userId_key" ON "NotificationSettings"("userId");

-- CreateIndex
CREATE INDEX "NotificationSettings_userId_idx" ON "NotificationSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationSettings_userId_key" ON "IntegrationSettings"("userId");

-- CreateIndex
CREATE INDEX "IntegrationSettings_userId_idx" ON "IntegrationSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DataSettings_userId_key" ON "DataSettings"("userId");

-- CreateIndex
CREATE INDEX "DataSettings_userId_idx" ON "DataSettings"("userId");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSettings" ADD CONSTRAINT "CalendarSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSettings" ADD CONSTRAINT "NotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationSettings" ADD CONSTRAINT "IntegrationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSettings" ADD CONSTRAINT "DataSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
