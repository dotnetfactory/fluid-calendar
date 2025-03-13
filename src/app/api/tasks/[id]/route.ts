import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RRule } from "rrule";
import { TaskStatus } from "@/types/task";
import { newDate } from "@/lib/date-utils";
import { normalizeRecurrenceRule } from "@/lib/utils/normalize-recurrence-rules";
import { logger } from "@/lib/logger";
import { authenticateRequest } from "@/lib/auth/api-auth";

const LOG_SOURCE = "task-route";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { id } = await params;
    const task = await prisma.task.findUnique({
      where: {
        id,
        // Ensure the task belongs to the current user
        userId,
      },
      include: {
        tags: true,
        project: true,
      },
    });

    if (!task) {
      return new NextResponse("Task not found", { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    logger.error(
      "Error fetching task:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { id } = await params;
    logger.info(`Updating task ${id}`, { userId }, LOG_SOURCE);

    const task = await prisma.task.findUnique({
      where: {
        id,
        // Ensure the task belongs to the current user
        userId,
      },
      include: {
        tags: true,
      },
    });

    if (!task) {
      logger.warn(`Task not found: ${id}`, { userId }, LOG_SOURCE);
      return new NextResponse("Task not found", { status: 404 });
    }

    const json = await request.json();
    logger.info(`Update payload for task ${id}`, { payload: json }, LOG_SOURCE);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tagIds, project, projectId, userId: _, ...updates } = json;

    // Set completedAt when task is marked as completed
    if (
      updates.status === TaskStatus.COMPLETED &&
      task.status !== TaskStatus.COMPLETED
    ) {
      updates.completedAt = newDate();
    }

    // Handle recurring task completion
    if (
      task.isRecurring &&
      updates.status === TaskStatus.COMPLETED &&
      task.recurrenceRule
    ) {
      try {
        // Normalize the recurrence rule to ensure compatibility with RRule
        const standardRecurrenceRule = normalizeRecurrenceRule(
          task.recurrenceRule
        );

        const rrule = RRule.fromString(standardRecurrenceRule!);

        // For tasks, we only care about the date part
        const baseDate = newDate(task.dueDate || newDate());
        // Set to start of day in UTC
        baseDate.setUTCHours(0, 0, 0, 0);

        // Add one day to the base date to ensure we get the next occurrence
        const searchDate = newDate(baseDate);
        searchDate.setDate(searchDate.getDate() + 1);

        // Get next occurrence and ensure it's just a date
        const nextOccurrence = rrule.after(searchDate);
        if (nextOccurrence) {
          nextOccurrence.setUTCHours(0, 0, 0, 0);
        }

        if (nextOccurrence) {
          // Create a completed instance as a separate task
          await prisma.task.create({
            data: {
              title: task.title,
              description: task.description,
              status: TaskStatus.COMPLETED,
              dueDate: baseDate, // Use the original due date for the completed instance
              duration: task.duration,
              priority: task.priority,
              energyLevel: task.energyLevel,
              preferredTime: task.preferredTime,
              projectId: task.projectId,
              isRecurring: false,
              completedAt: newDate(), // Set completedAt for the completed instance
              // Associate the task with the current user
              userId,
              tags: {
                connect: task.tags.map((tag) => ({ id: tag.id })),
              },
            },
          });

          // Update the recurring task with new due date and reset status
          updates.dueDate = nextOccurrence;
          updates.status = TaskStatus.TODO;
          updates.lastCompletedDate = newDate();
        }
      } catch (error) {
        logger.error(
          "Error handling task completion:",
          {
            error: error instanceof Error ? error.message : String(error),
          },
          LOG_SOURCE
        );
        return new NextResponse("Error handling task completion", {
          status: 500,
        });
      }
    }

    // Normalize recurrence rule if it exists in updates
    if (updates.recurrenceRule) {
      updates.recurrenceRule = normalizeRecurrenceRule(updates.recurrenceRule);
    }

    const updatedTask = await prisma.task.update({
      where: {
        id: id,
        // Ensure the task belongs to the current user
        userId,
      },
      data: {
        ...updates,
        ...(tagIds && {
          tags: {
            set: [], // First disconnect all tags
            connect: tagIds.map((id: string) => ({ id })), // Then connect new ones
          },
        }),
        project:
          projectId === null
            ? { disconnect: true }
            : projectId
            ? { connect: { id: projectId } }
            : undefined,
      },
      include: {
        tags: true,
        project: true,
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    logger.error(
      "Error updating task:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { id } = await params;
    const task = await prisma.task.findUnique({
      where: {
        id,
        // Ensure the task belongs to the current user
        userId,
      },
    });

    if (!task) {
      return new NextResponse("Task not found", { status: 404 });
    }

    await prisma.task.delete({
      where: {
        id,
        // Ensure the task belongs to the current user
        userId,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error(
      "Error deleting task:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
