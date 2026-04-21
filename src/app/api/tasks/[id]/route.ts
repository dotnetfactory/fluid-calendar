import { NextRequest, NextResponse } from "next/server";

import { Task } from "@prisma/client";
import { RRule } from "rrule";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  ChangeType,
  TaskChangeTracker,
} from "@/lib/task-sync/task-change-tracker";
import { normalizeRecurrenceRule } from "@/lib/utils/normalize-recurrence-rules";
import {
  inferCompletedReason,
  inferRescheduleReason,
} from "@/services/logging/InferenceEngine";
import { SchedulerEventLogger } from "@/services/logging/SchedulerEventLogger";
import { removeTaskGCalEvent } from "@/services/scheduling/GCalPushService";

import { TaskStatus } from "@/types/task";

const LOG_SOURCE = "task-route";

async function emitSchedulerEvents(
  oldTask: Task,
  newTask: Task,
  userId: string,
  changeSource: string
): Promise<void> {
  const base = { userId, taskId: newTask.id };

  // 1. Reschedule: scheduledStart/End changed, not by the scheduler itself
  const scheduleChanged =
    oldTask.scheduledStart?.getTime() !== newTask.scheduledStart?.getTime() ||
    oldTask.scheduledEnd?.getTime() !== newTask.scheduledEnd?.getTime();

  if (
    scheduleChanged &&
    changeSource !== "scheduler" &&
    oldTask.scheduledStart &&
    oldTask.scheduledEnd &&
    newTask.scheduledStart &&
    newTask.scheduledEnd
  ) {
    // Look up the most recent SCHEDULE_DECISION for this task to recover scheduler factors
    const priorDecision = await prisma.schedulerEvent.findFirst({
      where: { taskId: newTask.id, eventType: "SCHEDULE_DECISION" },
      orderBy: { occurredAt: "desc" },
    });

    const decisionPayload = priorDecision?.payload as
      | {
          chosen?: { score: number; factors: Record<string, number> };
          alternatives?: Array<{
            start: string;
            end: string;
            score: number;
            factors: Record<string, number>;
          }>;
        }
      | undefined;

    // Detect if the new slot matches an alternative from the scheduler's original decision
    let matchedAlternativeRank: number | null = null;
    if (decisionPayload?.alternatives) {
      const idx = decisionPayload.alternatives.findIndex(
        (alt) =>
          new Date(alt.start).getTime() === newTask.scheduledStart?.getTime()
      );
      if (idx >= 0) matchedAlternativeRank = idx + 2; // alternatives are 2..6
    }

    const source =
      changeSource === "omnifocus"
        ? "omnifocus_sync"
        : changeSource === "api"
          ? "api"
          : "ui_edit_modal";

    const minutesSinceOriginalPlacement = oldTask.lastScheduled
      ? Math.round(
          (Date.now() - oldTask.lastScheduled.getTime()) / 60000
        )
      : null;

    const inferredReason = inferRescheduleReason({
      fromStart: oldTask.scheduledStart,
      toStart: newTask.scheduledStart,
      rescheduleNumber: 1, // Phase 0a does not yet track reschedule count; fix in post-MVP
      source,
      matchedAlternativeRank,
    });

    await SchedulerEventLogger.logUserReschedule(base, {
      from: {
        start: oldTask.scheduledStart.toISOString(),
        end: oldTask.scheduledEnd.toISOString(),
        wasSchedulerPlaced: oldTask.scheduleScore !== null,
        schedulerScore: decisionPayload?.chosen?.score ?? null,
        schedulerFactors:
          (decisionPayload?.chosen?.factors as UserRescheduleFactors | undefined) ??
          null,
        minutesSinceOriginalPlacement,
      },
      to: {
        start: newTask.scheduledStart.toISOString(),
        end: newTask.scheduledEnd.toISOString(),
        computedFactors: null,
        computedScore: null,
      },
      rescheduleNumber: 1,
      source,
      inferredReason,
      matchedAlternativeRank,
    });
  }

  // 2. Completion: status transitioned to COMPLETED
  if (
    oldTask.status !== TaskStatus.COMPLETED &&
    newTask.status === TaskStatus.COMPLETED
  ) {
    const completedAt = newTask.completedAt ?? newDate();
    const scheduledStart = newTask.scheduledStart;
    const scheduledEnd = newTask.scheduledEnd;
    const wasScheduled = scheduledStart !== null && scheduledEnd !== null;

    const completionLagMinutes =
      wasScheduled && scheduledEnd
        ? Math.round((completedAt.getTime() - scheduledEnd.getTime()) / 60000)
        : null;

    const completedInScheduledWindow =
      wasScheduled &&
      scheduledStart !== null &&
      scheduledEnd !== null &&
      completedAt.getTime() >= scheduledStart.getTime() - 15 * 60000 &&
      completedAt.getTime() <= scheduledEnd.getTime() + 15 * 60000;

    const inferredReason = inferCompletedReason({
      wasScheduled,
      completionLagMinutes,
      completedInScheduledWindow,
      rescheduleCountBeforeCompletion: 0, // Phase 0a does not yet track reschedule history
      scheduleLockedAtCompletion: newTask.scheduleLocked,
      isRepeatPatternMatch: false,
    });

    const source =
      changeSource === "omnifocus" ? "omnifocus_sync"
        : changeSource === "api" ? "api"
        : "ui";

    await SchedulerEventLogger.logTaskCompleted(base, {
      completedAt: completedAt.toISOString(),
      wasScheduled,
      scheduledStart: scheduledStart?.toISOString() ?? null,
      scheduledEnd: scheduledEnd?.toISOString() ?? null,
      completedInScheduledWindow,
      completionLagMinutes,
      rescheduleCountBeforeCompletion: 0,
      durationEstimatedMinutes: newTask.duration ?? 0,
      durationActualMinutes: null,
      source,
      inferredReason,
      promptedForFeedback: false,
    });
  }

  // 3. Lock/unlock transition
  if (oldTask.scheduleLocked !== newTask.scheduleLocked) {
    await SchedulerEventLogger.logTaskLocked(base, {
      scheduledStart: newTask.scheduledStart?.toISOString() ?? null,
      scheduledEnd: newTask.scheduledEnd?.toISOString() ?? null,
      locked: newTask.scheduleLocked,
      factorsAtLockTime: null,
    });
  }
}

// Permissive: historical events written by SCHEDULER_VERSION <= 1.0.0 include
// a priorityScore key that newer events omit. Accept any numeric factor bag.
type UserRescheduleFactors = Record<string, number>;

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
    const { tagIds, project: _p, projectId, userId: _u, scheduleId, ...rawUpdates } = json;

    // Only allow known writeable scalar Task fields to prevent Prisma errors
    const allowedFields = new Set([
      "title", "description", "status", "dueDate", "startDate", "duration",
      "priority", "energyLevel", "preferredTime", "isAutoScheduled",
      "scheduleLocked", "scheduledStart", "scheduledEnd", "scheduleScore",
      "lastScheduled", "postponedUntil", "isRecurring", "recurrenceRule",
      "lastCompletedDate", "completedAt", "isBlocked", "blockedReason",
      "externalTaskId", "source", "lastSyncedAt", "externalListId",
      "externalCreatedAt", "externalUpdatedAt", "syncStatus", "syncError",
      "syncHash", "skipSync",
      "gcalEventId", "gcalFeedId", "gcalSyncStatus",
    ]);
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawUpdates)) {
      if (allowedFields.has(key)) {
        updates[key] = value;
      }
    }

    // Handle schedule relation (scheduleId -> schedule: { connect/disconnect })
    if (scheduleId !== undefined) {
      if (scheduleId) {
        updates.schedule = { connect: { id: scheduleId } };
      } else {
        updates.schedule = { disconnect: true };
      }
    }

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
                originalStartDate: task.startDate?.toISOString(),
                originalDueDate: task.dueDate?.toISOString(),
                deltaInDays: startToDueDelta,
                newDueDate: nextOccurrence.toISOString(),
                newStartDate: nextStartDate.toISOString(),
              },
              LOG_SOURCE
            );
          }

          // Create a completed instance as a separate task
          await prisma.task.create({
            data: {
              title: task.title,
              description: task.description,
              status: TaskStatus.COMPLETED,
              dueDate: baseDate, // Use the original due date for the completed instance
              startDate: task.startDate, // Use the original start date for the completed instance
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
          updates.startDate = nextStartDate; // Update the start date if calculated
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
      updates.recurrenceRule = normalizeRecurrenceRule(updates.recurrenceRule as string);
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

    // Determine change source from request header (sync script sets this)
    const changeSource = request.headers.get("X-Sync-Source") || "user";

    // Track the update for sync purposes
    const shouldTrack = mappingId || (task.source === "omnifocus" && task.externalTaskId);
    if (shouldTrack) {
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
        undefined,
        mappingId || undefined,
        changeSource
      );

      logger.info(
        `Tracked UPDATE change for task ${task.id} (source: ${changeSource})`,
        {
          taskId: task.id,
          mappingId,
          changeSource,
          changes: Object.keys(changes),
        },
        LOG_SOURCE
      );
    }

    // Emit scheduler events (fire-and-forget; failures logged but never thrown)
    try {
      await emitSchedulerEvents(oldTask, updatedTask, userId, changeSource);
    } catch (err) {
      logger.error(
        "Failed to emit scheduler events",
        { taskId: id, error: err instanceof Error ? err.message : String(err) },
        LOG_SOURCE
      );
    }

    // Clean up GCal event if task was completed (fire-and-forget)
    if (
      updatedTask.status === TaskStatus.COMPLETED &&
      oldTask.status !== TaskStatus.COMPLETED &&
      updatedTask.gcalEventId
    ) {
      removeTaskGCalEvent(
        {
          id: updatedTask.id,
          gcalEventId: updatedTask.gcalEventId,
          gcalFeedId: updatedTask.gcalFeedId,
        },
        userId
      ).catch((error) => {
        logger.error(
          "Failed to remove GCal event on task completion",
          { taskId: updatedTask.id, error: error instanceof Error ? error.message : String(error) },
          LOG_SOURCE
        );
      });
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Task PUT error:", errMsg, error);
    logger.error("Error updating task:", { error: errMsg }, LOG_SOURCE);
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
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

    // Determine change source from request header
    const changeSource = request.headers.get("X-Sync-Source") || "user";

    // Track the deletion for sync purposes
    const shouldTrack = mappingId || (task.source === "omnifocus" && task.externalTaskId);
    if (shouldTrack && task.externalTaskId && task.source) {
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
        undefined,
        mappingId || undefined,
        changeSource
      );

      logger.info(
        `Tracked DELETE change for task ${id} (source: ${changeSource})`,
        {
          taskId: id,
          mappingId,
          changeSource,
          externalTaskId: task.externalTaskId,
          title: task.title,
        },
        LOG_SOURCE
      );
    }

    // Clean up GCal event before deleting the task
    if (task.gcalEventId) {
      try {
        await removeTaskGCalEvent(
          {
            id: task.id,
            gcalEventId: task.gcalEventId,
            gcalFeedId: task.gcalFeedId,
          },
          userId
        );
      } catch (error) {
        logger.error(
          "Failed to remove GCal event on task deletion",
          { taskId: task.id, error: error instanceof Error ? error.message : String(error) },
          LOG_SOURCE
        );
        // Continue with deletion even if GCal cleanup fails
      }
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
