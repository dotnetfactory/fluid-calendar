import { prisma } from "@/lib/prisma";

/**
 * Readiness check for auto-scheduling via the API.
 *
 * The scheduler (TaskSchedulingService → SchedulingService → TimeSlotManager)
 * resolves the user's timezone from `UserSettings.timeZone` and threads it
 * explicitly into slot calculation. The ONE gap for keyless API requests is
 * when that timezone (or AutoScheduleSettings) was never configured: the
 * TimeSlotManager would then fall back to the client settings store, which on
 * the server holds no user state — silently scheduling in the wrong timezone
 * (a 9am task could land at midnight).
 *
 * Rather than mis-schedule, the v1 task/schedule endpoints call this first and
 * return 400 with a clear hint when the user isn't set up.
 */
export async function autoScheduleReadiness(
  userId: string
): Promise<{ ready: true } | { ready: false; reason: string }> {
  const [settings, userSettings] = await Promise.all([
    prisma.autoScheduleSettings.findUnique({
      where: { userId },
      select: { id: true },
    }),
    prisma.userSettings.findUnique({
      where: { userId },
      select: { timeZone: true },
    }),
  ]);

  if (!settings) {
    return {
      ready: false,
      reason:
        "Auto-scheduling is not configured for this account. Open FluidCalendar and set up auto-schedule settings before scheduling via the API.",
    };
  }
  if (!userSettings?.timeZone) {
    return {
      ready: false,
      reason:
        "No timezone is set for this account. Set your timezone in FluidCalendar settings before scheduling via the API, otherwise tasks would be placed in the wrong timezone.",
    };
  }
  return { ready: true };
}
