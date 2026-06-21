import { NextRequest } from "next/server";

import { v1Write, ApiHttpError } from "@/lib/api/v1";
import { autoScheduleReadiness } from "@/lib/api/schedule-guard";
import { logger } from "@/lib/logger";
import { scheduleAllTasksForUser } from "@/services/scheduling/TaskSchedulingService";

const LOG_SOURCE = "api-v1-schedule-route";

/**
 * POST /api/v1/schedule — Trigger a replan.
 *
 * Checks autoScheduleReadiness first; if not ready, returns 400 with reason.
 * Otherwise schedules all auto-scheduled tasks for the user.
 * Uses a tighter rate limit (6/min) since this is a heavy operation.
 */
export async function POST(request: NextRequest) {
  return v1Write(
    request,
    "POST /api/v1/schedule",
    async ({ userId }) => {
      // Check if the user is ready for auto-scheduling
      const readiness = await autoScheduleReadiness(userId);
      if (!readiness.ready) {
        throw new ApiHttpError("INVALID_ARGUMENT", readiness.reason);
      }

      // Schedule all tasks for the user
      const tasks = await scheduleAllTasksForUser(userId);

      logger.info(
        "Scheduled all tasks for user via API",
        { userId, scheduledCount: tasks.length },
        LOG_SOURCE
      );

      return {
        status: 200,
        body: {
          scheduled: tasks.length,
          tasks,
        },
      };
    },
    { bucket: "schedule", limit: 6, windowMs: 60000 }
  );
}
