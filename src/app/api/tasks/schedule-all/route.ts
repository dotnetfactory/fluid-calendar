import { NextRequest, NextResponse } from "next/server";

import { scheduleAllTasksForUser } from "@/services/scheduling/TaskSchedulingService";
import { syncScheduledTasksToGCal } from "@/services/scheduling/GCalPushService";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "task-schedule-route";

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Use the common function to schedule all tasks
    const { searchParams } = new URL(request.url);
    const fullRebalance = searchParams.get("full") === "true";
    const tasksWithRelations = await scheduleAllTasksForUser(userId, fullRebalance);

    // Await GCal push with a timeout so the response includes gcalEventId values.
    // If push exceeds 15s or fails, return tasks without gcalEventId updates.
    const taskIds = tasksWithRelations.map((t) => t.id);
    try {
      await Promise.race([
        syncScheduledTasksToGCal(userId, taskIds),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("GCal sync timeout")), 15000)
        ),
      ]);

      // Re-fetch tasks to include gcalEventId values written by the push
      const refreshedTasks = await prisma.task.findMany({
        where: { id: { in: taskIds }, userId },
        include: { tags: true, project: true },
      });
      return NextResponse.json(refreshedTasks);
    } catch (error) {
      logger.info(
        "GCal push did not complete in time, returning tasks without gcalEventId",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
      return NextResponse.json(tasksWithRelations);
    }
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
