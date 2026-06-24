-- Periodic auto-replan settings on SystemSettings.
-- A host heartbeat calls the internal cron endpoint; the endpoint re-plans only
-- once the configured interval has elapsed, so cadence is admin-configurable.
ALTER TABLE "SystemSettings" ADD COLUMN "autoReplanEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SystemSettings" ADD COLUMN "autoReplanIntervalMinutes" INTEGER NOT NULL DEFAULT 15;
ALTER TABLE "SystemSettings" ADD COLUMN "autoReplanLastRunAt" TIMESTAMP(3);
