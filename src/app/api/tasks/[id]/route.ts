import { NextRequest, NextResponse } from "next/server";

import { Task } from "@prisma/client";
import { RRule } from "rrule";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Temporarily disabled for debug logging purposes
import { authenticateRequest } from "@/lib/auth/api-auth";
import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  ChangeType,
  TaskChangeTracker,
} from "@/lib/task-sync/task-change-tracker";
import { normalizeRecurrenceRule } from "@/lib/utils/normalize-recurrence-rules";

import { TaskStatus } from "@/types/task";

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
        logger.info(
          "Starting recurring task completion process",
          {
            taskId: task.id,
            title: task.title,
            userId,
            source: task.source || "internal",
            externalTaskId: task.externalTaskId || "none",
            isRecurring: task.isRecurring,
            recurrenceRule: task.recurrenceRule,
            projectId: task.projectId,
            callerInfo: request.headers.get("user-agent") || "unknown",
            requestSource: request.headers.get("x-request-source") || "unknown",
            requestID: Math.random().toString(36).substring(2, 15),
            processingStage: "START_RECURRING_COMPLETION",
            stackTrace: new Error().stack
              ?.split("\n")
              .slice(0, 5)
              .join("\n") as any,
          },
          LOG_SOURCE
        );

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
          // Calculate the time delta between start date and due date (if both exist)
          let nextStartDate = undefined;
          if (task.startDate && task.dueDate) {
            // Calculate the number of days between the original start and due dates
            const startToDueDelta = Math.round(
              (task.dueDate.getTime() - task.startDate.getTime()) /
                (1000 * 60 * 60 * 24)
            );

            // Apply the same delta to the new due date to get the new start date
            const newStartDate = new Date(nextOccurrence);
            newStartDate.setDate(newStartDate.getDate() - startToDueDelta);
            nextStartDate = newStartDate;

            logger.info(
              "Calculated new start date for recurring task",
              {
                taskId: task.id,
                title: task.title,
                originalStartDate: task.startDate?.toISOString(),
                originalDueDate: task.dueDate?.toISOString(),
                deltaInDays: startToDueDelta,
                newDueDate: nextOccurrence.toISOString(),
                newStartDate: nextStartDate.toISOString(),
                processingStage: "CALCULATED_NEW_DATES",
              },
              LOG_SOURCE
            );
          }

          // Find existing completed tasks with this title in general to see what's in the DB
          const allSimilarTasks = await prisma.task.findMany({
            where: {
              title: task.title,
              userId,
              projectId: task.projectId,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 10, // Limit to 10 most recent
          });

          logger.info(
            "Current similar tasks in database",
            {
              taskId: task.id,
              title: task.title,
              similarTasksCount: allSimilarTasks.length,
              taskSample: allSimilarTasks.map((t) => ({
                id: t.id,
                status: t.status,
                dueDate: t.dueDate?.toISOString(),
                isRecurring: t.isRecurring,
                recurrenceRule: t.recurrenceRule,
                source: t.source,
                externalTaskId: t.externalTaskId,
                createdAt: t.createdAt.toISOString(),
              })) as any,
              processingStage: "SIMILAR_TASKS_CHECK",
            },
            LOG_SOURCE
          );

          // FIX: Check if a completed instance with this exact date already exists
          const existingCompletedTask = await prisma.task.findFirst({
            where: {
              title: task.title,
              status: TaskStatus.COMPLETED,
              dueDate: baseDate,
              userId,
              projectId: task.projectId,
            },
          });

          logger.info(
            "Checking for existing completed instance",
            {
              taskId: task.id,
              title: task.title,
              dueDate: baseDate.toISOString(),
              existingTaskFound: !!existingCompletedTask,
              existingTaskId: existingCompletedTask?.id || "none",
              checkParams: JSON.stringify({
                title: task.title,
                status: TaskStatus.COMPLETED,
                dueDate: baseDate.toISOString(),
                userId,
                projectId: task.projectId,
              }),
              processingStage: "COMPLETED_INSTANCE_CHECK",
            },
            LOG_SOURCE
          );

          // Additional check: find all tasks with this title and due date
          const allTasksWithSameTitleAndDate = await prisma.task.findMany({
            where: {
              title: task.title,
              dueDate: baseDate,
              userId,
              projectId: task.projectId,
            },
          });

          logger.info(
            "All tasks with same title and due date",
            {
              taskId: task.id,
              title: task.title,
              dueDate: baseDate.toISOString(),
              matchCount: allTasksWithSameTitleAndDate.length,
              matches: allTasksWithSameTitleAndDate.map((t) => ({
                id: t.id,
                status: t.status,
                externalTaskId: t.externalTaskId,
                source: t.source,
                isRecurring: t.isRecurring,
              })),
              processingStage: "SAME_TITLE_DATE_CHECK",
            },
            LOG_SOURCE
          );

          // Only create a new completed instance if one doesn't already exist
          if (!existingCompletedTask) {
            // Create task data with all fields for logging
            const completedTaskData = {
              title: task.title,
              description: task.description,
              status: TaskStatus.COMPLETED,
              dueDate: baseDate,
              startDate: task.startDate,
              duration: task.duration,
              priority: task.priority,
              energyLevel: task.energyLevel,
              preferredTime: task.preferredTime,
              projectId: task.projectId,
              isRecurring: false,
              completedAt: newDate(),
              userId,
              externalTaskId: task.externalTaskId,
              source: task.source,
            };

            logger.info(
              "Creating completed instance for recurring task",
              {
                taskId: task.id,
                title: task.title,
                completedTaskData: JSON.stringify(completedTaskData),
                stackTrace: new Error().stack || "No stack trace",
                processingStage: "CREATING_COMPLETED_INSTANCE",
              },
              LOG_SOURCE
            );

            // Double-check again right before creating to avoid race conditions
            const doubleCheckTask = await prisma.task.findFirst({
              where: {
                title: task.title,
                status: TaskStatus.COMPLETED,
                dueDate: baseDate,
                userId,
                projectId: task.projectId,
              },
            });

            if (doubleCheckTask) {
              logger.warn(
                "Race condition detected! Task already created between checks",
                {
                  taskId: task.id,
                  existingTaskId: doubleCheckTask.id,
                  title: task.title,
                  dueDate: baseDate.toISOString(),
                  processingStage: "RACE_CONDITION_DETECTED",
                },
                LOG_SOURCE
              );
            } else {
              // Create a completed instance as a separate task
              const completedTask = await prisma.task.create({
                data: {
                  ...completedTaskData,
                  tags: {
                    connect: task.tags.map((tag) => ({ id: tag.id })),
                  },
                },
              });

              logger.info(
                "Created completed instance for recurring task",
                {
                  taskId: task.id,
                  title: task.title,
                  dueDate: baseDate?.toISOString(),
                  newTaskId: completedTask.id,
                  completedTask: {
                    id: completedTask.id,
                    status: completedTask.status,
                    externalTaskId: completedTask.externalTaskId,
                    source: completedTask.source,
                  } as any,
                  processingStage: "COMPLETED_INSTANCE_CREATED",
                },
                LOG_SOURCE
              );
            }
          } else {
            logger.info(
              "Skipped creating duplicate completed instance for recurring task",
              {
                taskId: task.id,
                existingTaskId: existingCompletedTask.id,
                dueDate: baseDate?.toISOString(),
                completed:
                  existingCompletedTask.completedAt?.toISOString() || "unknown",
                existingTask: {
                  externalTaskId: existingCompletedTask.externalTaskId,
                  source: existingCompletedTask.source,
                  createdAt: existingCompletedTask.createdAt.toISOString(),
                } as any,
                processingStage: "SKIPPED_DUPLICATE_CREATION",
              },
              LOG_SOURCE
            );
          }

          // Log original and new task values for tracking
          logger.info(
            "Updating recurring task with new dates",
            {
              taskId: task.id,
              title: task.title,
              currentStatus: task.status,
              newStatus: TaskStatus.TODO,
              currentDueDate: task.dueDate?.toISOString() || "none",
              newDueDate: nextOccurrence.toISOString(),
              currentStartDate: task.startDate?.toISOString() || "none",
              newStartDate: nextStartDate?.toISOString() || "none",
              processingStage: "UPDATING_RECURRING_TASK",
            },
            LOG_SOURCE
          );

          // Update the recurring task with new due date and reset status
          updates.dueDate = nextOccurrence;
          updates.startDate = nextStartDate; // Update the start date if calculated
          updates.status = TaskStatus.TODO;
          updates.lastCompletedDate = newDate();
        } else {
          logger.warn(
            "No next occurrence found for recurring task",
            {
              taskId: task.id,
              title: task.title,
              recurrenceRule: task.recurrenceRule,
              baseDate: baseDate.toISOString(),
              searchDate: searchDate.toISOString(),
            },
            LOG_SOURCE
          );
        }
      } catch (error) {
        logger.error(
          "Error handling task completion:",
          {
            error: error instanceof Error ? error.message : String(error),
            stackTrace:
              error instanceof Error
                ? error.stack || "No stack trace"
                : "No stack trace",
            taskId: task.id,
            title: task.title,
            recurrenceRule: task.recurrenceRule,
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

    // Find the project's task mapping if it exists
    let mappingId = null;
    const targetProjectId = projectId || task.projectId;

    if (targetProjectId) {
      const mapping = await prisma.taskListMapping.findFirst({
        where: {
          projectId: targetProjectId,
        },
      });
      if (mapping) {
        mappingId = mapping.id;
      }
    }

    // Save the old task for change tracking
    const oldTask = { ...task };

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

    // Track the update for sync purposes if the task is in a mapped project
    if (mappingId) {
      const changeTracker = new TaskChangeTracker();
      const changes = changeTracker.compareTaskObjects(
        oldTask,
        updatedTask as Partial<Task>
      );

      await changeTracker.trackChange(
        task.id,
        "UPDATE" as ChangeType,
        userId,
        changes,
        undefined, // providerId will be set during sync
        mappingId
      );

      logger.info(
        `Tracked UPDATE change for task ${task.id} in mapping ${mappingId}`,
        {
          taskId: task.id,
          mappingId,
          changes: Object.keys(changes),
        },
        LOG_SOURCE
      );
    }

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
      include: {
        project: true,
      },
    });

    if (!task) {
      return new NextResponse("Task not found", { status: 404 });
    }

    // Check if the task belongs to a mapped project
    let mappingId = null;
    if (task.projectId) {
      const mapping = await prisma.taskListMapping.findFirst({
        where: {
          projectId: task.projectId,
        },
      });
      if (mapping) {
        mappingId = mapping.id;
      }
    }

    // Track the deletion for sync purposes if the task was in a mapped project
    // and had an external ID BEFORE actually deleting the task
    if (mappingId && task.externalTaskId && task.source) {
      const changeTracker = new TaskChangeTracker();
      await changeTracker.trackChange(
        id,
        "DELETE" as ChangeType,
        userId,
        {
          externalTaskId: task.externalTaskId,
          source: task.source,
          externalListId: task.externalListId,
          projectId: task.projectId,
          title: task.title,
        },
        undefined, // providerId will be set during sync
        mappingId
      );

      logger.info(
        `Tracked DELETE change for task ${id} in mapping ${mappingId}`,
        {
          taskId: id,
          mappingId,
          externalTaskId: task.externalTaskId,
          title: task.title,
        },
        LOG_SOURCE
      );
    }

    // Now delete the task AFTER tracking the change
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
