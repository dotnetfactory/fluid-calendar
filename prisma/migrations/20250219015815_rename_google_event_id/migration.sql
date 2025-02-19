-- Rename column googleEventId to externalEventId
ALTER TABLE "CalendarEvent" RENAME COLUMN "googleEventId" TO "externalEventId";

-- Drop the old index
DROP INDEX "CalendarEvent_googleEventId_idx";

-- Create a new index for externalEventId
CREATE INDEX "CalendarEvent_externalEventId_idx" ON "CalendarEvent"("externalEventId");