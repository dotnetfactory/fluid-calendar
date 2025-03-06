import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { SchedulingService } from "@/services/scheduling/SchedulingService";
import { AutoScheduleSettings } from "@prisma/client";
import { TaskStatus } from "@/types/task";
import { logger } from "@/lib/logger";
import { authenticateRequest } from "@/lib/auth/api-auth";

const LOG_SOURCE = "task-schedule-route";

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { settings } = (await request.json()) as {
      settings: AutoScheduleSettings;
    };

    //reset all scheduled tasks for the current user
    await prisma.task.updateMany({
      where: {
        isAutoScheduled: true,
        scheduleLocked: false,
        userId,
      },
      data: {
        scheduledStart: null,
        scheduledEnd: null,
        scheduleScore: null,
      },
    });

    // Get all tasks marked for auto-scheduling that are not locked for the current user
    const tasksToSchedule = await prisma.task.findMany({
      where: {
        isAutoScheduled: true,
        scheduleLocked: false,
        status: {
          not: TaskStatus.COMPLETED,
        },
        userId,
      },
      include: {
        project: true,
        tags: true,
      },
    });

    // Get locked tasks (we'll keep their schedules) for the current user
    const lockedTasks = await prisma.task.findMany({
      where: {
        isAutoScheduled: true,
        scheduleLocked: true,
        status: {
          not: TaskStatus.COMPLETED,
        },
        userId,
      },
      include: {
        project: true,
        tags: true,
      },
    });

    // Initialize scheduling service with settings
    const schedulingService = new SchedulingService(settings);

    // Clear existing schedules for non-locked tasks only
    await prisma.task.updateMany({
      where: {
        id: {
          in: tasksToSchedule.map((task) => task.id),
        },
        userId,
      },
      data: {
        scheduledStart: null,
        scheduledEnd: null,
        scheduleScore: null,
      },
    });

    // Schedule all non-locked tasks with full task objects
    const updatedTasks = await schedulingService.scheduleMultipleTasks([
      ...tasksToSchedule,
      ...lockedTasks,
    ], userId);

    // Fetch the tasks again with their relations to return
    const tasksWithRelations = await prisma.task.findMany({
      where: {
        id: {
          in: updatedTasks.map((task) => task.id),
        },
        userId,
      },
      include: {
        tags: true,
        project: true,
      },
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
