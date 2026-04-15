import { NextRequest, NextResponse } from "next/server";

import { scheduleAllTasksForUser } from "@/services/scheduling/TaskSchedulingService";
import { syncScheduledTasksToGCal } from "@/services/scheduling/GCalPushService";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "task-schedule-route";

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Use the common function to schedule all tasks
    // If settings are provided, use them, otherwise use the overloaded function
    const { searchParams } = new URL(request.url);
    const fullRebalance = searchParams.get("full") === "true";
    const tasksWithRelations = await scheduleAllTasksForUser(userId, fullRebalance);

    // Fire-and-forget: push scheduled tasks to GCal asynchronously.
    // Never block the scheduling response on GCal API calls.
    const taskIds = tasksWithRelations.map((t) => t.id);
    syncScheduledTasksToGCal(userId, taskIds).catch((error) => {
      logger.error(
        "Background GCal sync failed",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    });

    return NextResponse.json(tasksWithRelations);
  } catch (error) {
    logger.error(
      "Error scheduling tasks:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to schedule tasks" },
      { status: 500 }
    );
  }
}
