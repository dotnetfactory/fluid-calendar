import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";

import { RRule } from "rrule";

import { v1Read, v1Write, ApiHttpError } from "@/lib/api/v1";
import { parseApiDate, parseOptionalApiDate } from "@/lib/api/dates";
import { paginated } from "@/lib/api/respond";
import { autoScheduleReadiness } from "@/lib/api/schedule-guard";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { repushDirtyBlocks, schedulePushTaskBlock } from "@/lib/task-block-push";
import { normalizeRecurrenceRule } from "@/lib/utils/normalize-recurrence-rules";
import { scheduleAllTasksForUser } from "@/services/scheduling/TaskSchedulingService";

const LOG_SOURCE = "api-v1-tasks-route";

const MAX_BATCH_SIZE = 100;

/**
 * POST /api/v1/tasks — Create one or more tasks.
 *
 * Accept a single task object OR an array of them.
 * - Validate title required, non-empty (INVALID_ARGUMENT)
 * - Batch max is 100 (INVALID_ARGUMENT)
 * - If any task has autoScheduled, call autoScheduleReadiness first
 * - Then call scheduleAllTasksForUser ONCE (not per task)
 * - Return single task if input was single object, array if input was array
 */
export async function POST(request: NextRequest) {
  return v1Write(request, "POST /api/v1/tasks", async ({ userId }) => {
    const json = await request.json();

    // Normalize to array for uniform processing
    const isSingleObject = !Array.isArray(json);
    const tasksInput = isSingleObject ? [json] : json;

    if (!Array.isArray(tasksInput)) {
      throw new ApiHttpError(
        "INVALID_ARGUMENT",
        "Request body must be a task object or an array of tasks"
      );
    }

    if (tasksInput.length === 0) {
      throw new ApiHttpError(
        "INVALID_ARGUMENT",
        "At least one task is required"
      );
    }

    if (tasksInput.length > MAX_BATCH_SIZE) {
      throw new ApiHttpError(
        "INVALID_ARGUMENT",
        `Batch size exceeds maximum of ${MAX_BATCH_SIZE}`
      );
    }

    // Validate every item up front (titles + RFC 3339 dates) so a bad item
    // fails the whole request before any task is created.
    for (let i = 0; i < tasksInput.length; i++) {
      const task = tasksInput[i];
      if (!task.title || typeof task.title !== "string" || task.title.trim() === "") {
        throw new ApiHttpError(
          "INVALID_ARGUMENT",
          "title is required and must be a non-empty string",
          { field: "title" }
        );
      }
      parseOptionalApiDate(task.dueDate, "dueDate");
      parseOptionalApiDate(task.startDate, "startDate");
      if (task.autoScheduled?.deadline !== undefined) {
        parseApiDate(task.autoScheduled.deadline, "autoScheduled.deadline");
      }
    }

    // Check if any task has autoScheduled and if so, verify readiness
    const hasAutoScheduled = tasksInput.some((t) => t.autoScheduled);
    if (hasAutoScheduled) {
      const readiness = await autoScheduleReadiness(userId);
      if (!readiness.ready) {
        throw new ApiHttpError("INVALID_ARGUMENT", readiness.reason);
      }
    }

    // Create all tasks
    const createdTasks = await Promise.all(
      tasksInput.map(async (taskInput) => {
        // Explicit allow-list of caller-settable fields. Anything else in the
        // body (userId, scheduledStart, blockEventId, syncStatus, …) is ignored
        // to prevent mass-assignment / cross-tenant writes via the public API.
        const {
          title,
          description,
          status,
          duration,
          priority,
          energyLevel,
          preferredTime,
          dueDate: dueDateInput,
          startDate,
          projectId,
          tagIds,
          recurrenceRule,
          autoScheduled,
        } = taskInput;

        // Map Motion-style autoScheduled to internal fields
        let isAutoScheduled = false;
        let mappedDueDate = dueDateInput;
        if (autoScheduled && typeof autoScheduled === "object") {
          isAutoScheduled = true;
          if (autoScheduled.deadline) {
            mappedDueDate = autoScheduled.deadline;
          }
        }

        // Normalize recurrence rule if provided
        const standardizedRecurrenceRule = recurrenceRule
          ? normalizeRecurrenceRule(recurrenceRule)
          : undefined;

        if (standardizedRecurrenceRule) {
          try {
            RRule.fromString(standardizedRecurrenceRule);
          } catch (error) {
            logger.error(
              "Error parsing recurrence rule:",
              {
                error:
                  error instanceof Error ? error.message : String(error),
              },
              LOG_SOURCE
            );
            throw new ApiHttpError("INVALID_ARGUMENT", "Invalid recurrence rule");
          }
        }

        const task = await prisma.task.create({
          data: {
            title,
            description: description || null,
            status: status || "todo",
            duration: duration || 30,
            priority: priority || null,
            energyLevel: energyLevel || null,
            preferredTime: preferredTime || null,
            dueDate: parseOptionalApiDate(mappedDueDate, "dueDate"),
            startDate: parseOptionalApiDate(startDate, "startDate"),
            projectId: projectId || null,
            isAutoScheduled,
            isRecurring: !!recurrenceRule,
            recurrenceRule: standardizedRecurrenceRule,
            userId,
            ...(tagIds && {
              tags: {
                connect: tagIds.map((id: string) => ({ id })),
              },
            }),
          },
          include: {
            tags: true,
            project: true,
          },
        });

        return task;
      })
    );

    // If any task was auto-scheduled, reschedule all tasks for the user ONCE
    if (hasAutoScheduled) {
      await scheduleAllTasksForUser(userId);
      // Push the newly-scheduled blocks to the calendar (if the user has
      // task→calendar push enabled) — mirrors the internal schedule-all route.
      await repushDirtyBlocks(userId);
      // Re-fetch the created tasks to get their scheduled positions
      const refreshedTasks = await prisma.task.findMany({
        where: { userId, id: { in: createdTasks.map((t) => t.id) } },
        include: {
          tags: true,
          project: true,
        },
      });
      // Replace createdTasks with refreshed versions (now positioned)
      for (let i = 0; i < createdTasks.length; i++) {
        const refreshed = refreshedTasks.find((t) => t.id === createdTasks[i].id);
        if (refreshed) {
          Object.assign(createdTasks[i], refreshed);
        }
      }
    } else {
      // Schedule calendar blocks for tasks with scheduledStart/End
      for (const task of createdTasks) {
        if (task.scheduledStart && task.scheduledEnd) {
          schedulePushTaskBlock(userId, task.id);
        }
      }
    }

    // Return single task if input was single, array if input was array
    const responseBody = isSingleObject ? createdTasks[0] : createdTasks;

    return {
      status: 201,
      body: responseBody,
    };
  });
}

/**
 * GET /api/v1/tasks — List the user's tasks with cursor pagination.
 *
 * Query params:
 *  - cursor: opaque pagination cursor
 *  - limit: max items (default 50, max 500)
 *  - status: optional filter
 *
 * Stable sort by (createdAt, id) desc.
 */
export async function GET(request: NextRequest) {
  return v1Read(request, async ({ userId }) => {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limitStr = searchParams.get("limit") || "50";
    const status = searchParams.get("status");

    const limit = Math.min(Math.max(1, parseInt(limitStr, 10) || 50), 500);

    // Decode cursor if provided (it's the id of the last item from prev page)
    let skip = 0;
    let skipId: string | undefined;
    if (cursor) {
      skipId = cursor;
      skip = 1; // Skip the cursor itself to avoid duplication
    }

    // Build the query
    const where: Prisma.TaskWhereInput = { userId };
    if (status) {
      where.status = status;
    }

    // Get limit + 1 to determine if there's a next page
    const rows = await prisma.task.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(skipId && { cursor: { id: skipId }, skip }),
      include: {
        tags: true,
        project: true,
      },
    });

    const hasMore = rows.length > limit;
    const data = rows.slice(0, limit);
    const nextCursor = hasMore ? data[data.length - 1]?.id || null : null;

    return {
      status: 200,
      body: paginated(data, nextCursor),
    };
  });
}
