-- AlterTable: Add username to User
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- CreateIndex: Unique constraint on username
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AlterTable: Add transparency to CalendarEvent
ALTER TABLE "CalendarEvent" ADD COLUMN "transparency" TEXT;

-- CreateTable: BookingLink
CREATE TABLE "BookingLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "selectedCalendars" TEXT NOT NULL DEFAULT '[]',
    "targetCalendarId" TEXT NOT NULL,
    "availabilityType" TEXT NOT NULL DEFAULT 'working_hours',
    "customAvailability" TEXT,
    "bufferBefore" INTEGER NOT NULL DEFAULT 0,
    "bufferAfter" INTEGER NOT NULL DEFAULT 0,
    "minNotice" INTEGER NOT NULL DEFAULT 60,
    "maxFutureDays" INTEGER NOT NULL DEFAULT 60,
    "videoProvider" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Booking
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "bookingLinkId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "guestNotes" TEXT,
    "guestTimezone" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "calendarEventId" TEXT,
    "videoLink" TEXT,
    "cancelToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: BookingLink unique constraint on userId+slug
CREATE UNIQUE INDEX "BookingLink_userId_slug_key" ON "BookingLink"("userId", "slug");

-- CreateIndex: BookingLink index on userId
CREATE INDEX "BookingLink_userId_idx" ON "BookingLink"("userId");

-- CreateIndex: Booking index on bookingLinkId
CREATE INDEX "Booking_bookingLinkId_idx" ON "Booking"("bookingLinkId");

-- CreateIndex: Booking index on hostId
CREATE INDEX "Booking_hostId_idx" ON "Booking"("hostId");

-- CreateIndex: Booking index on guestEmail
CREATE INDEX "Booking_guestEmail_idx" ON "Booking"("guestEmail");

-- CreateIndex: Booking index on status
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- AddForeignKey: BookingLink -> User
ALTER TABLE "BookingLink" ADD CONSTRAINT "BookingLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Booking -> BookingLink
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_bookingLinkId_fkey" FOREIGN KEY ("bookingLinkId") REFERENCES "BookingLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Booking -> User (host)
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
