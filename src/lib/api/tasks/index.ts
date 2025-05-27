import { Project, Tag, Task } from "@prisma/client";
import { RRule } from "rrule";

import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  ChangeType,
  TaskChangeTracker,
} from "@/lib/task-sync/task-change-tracker";
import { normalizeRecurrenceRule } from "@/lib/utils/normalize-recurrence-rules";

import {
  type CreateTaskInput,
  CreateTaskInputSchema,
  type GetAllTasksInput,
  GetAllTasksInputSchema,
  type GetTaskByIdInput,
  GetTaskByIdInputSchema,
  type NormalizeRecurrenceInput,
  NormalizeRecurrenceInputSchema,
  type ScheduleAllTasksInput,
  ScheduleAllTasksInputSchema,
  type UpdateTaskInput,
  UpdateTaskInputSchema,
} from "./schemas";

const LOG_SOURCE = "TaskAPI";

// Extended task type with relations
type TaskWithRelations = Task & {
  tags?: Tag[];
  project?: Project | null;
};

/**
 * Get all tasks for a user with filtering
 */
export async function getAllTasks(
  userId: string,
  input: GetAllTasksInput = { hideUpcomingTasks: false }
): Promise<TaskWithRelations[]> {
  const validatedInput = GetAllTasksInputSchema.parse(input);
  const {
    status,
    tagIds,
    energyLevel,
    timePreference,
    search,
    startDate,
    endDate,
    taskStartDate,
    hideUpcomingTasks,
    projectId,
  } = validatedInput;

  logger.info(
    "Getting all tasks for user",
    { userId, filterCount: Object.keys(validatedInput).length },
    LOG_SOURCE
  );

  const now = newDate();
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      ...(status && status.length > 0 && { status: { in: status } }),
      ...(energyLevel &&
        energyLevel.length > 0 && { energyLevel: { in: energyLevel } }),
      ...(timePreference &&
        timePreference.length > 0 && {
          preferredTime: { in: timePreference },
        }),
      ...(tagIds &&
        tagIds.length > 0 && { tags: { some: { id: { in: tagIds } } } }),
      ...(projectId && { projectId }),
      ...(search && {
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
        ],
      }),
      ...(startDate &&
        endDate && {
          dueDate: {
            gte: startDate,
            lte: endDate,
          },
        }),
      ...(taskStartDate && {
        startDate: {
          gte: taskStartDate,
        },
      }),
      ...(hideUpcomingTasks && {
        OR: [{ startDate: null }, { startDate: { lte: now } }],
      }),
    },
    include: {
      tags: true,
      project: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  logger.info(
    "Retrieved tasks for user",
    { userId, taskCount: tasks.length },
    LOG_SOURCE
  );

  return tasks;
}

/**
 * Get a specific task by ID
 */
export async function getTaskById(
  userId: string,
  input: GetTaskByIdInput
): Promise<TaskWithRelations | null> {
  const { taskId, includeTags, includeProject } =
    GetTaskByIdInputSchema.parse(input);

  logger.info(
    "Getting task by ID",
    { userId, taskId, includeTags, includeProject },
    LOG_SOURCE
  );

  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
      userId, // Ensure the task belongs to the current user
    },
    include: {
      ...(includeTags && { tags: true }),
      ...(includeProject && { project: true }),
    },
  });

  if (!task) {
    logger.warn("Task not found", { userId, taskId }, LOG_SOURCE);
    return null;
  }

  logger.info(
    "Retrieved task",
    { userId, taskId, taskTitle: task.title },
    LOG_SOURCE
  );

  return task;
}

/**
 * Create a new task
 */
export async function createTask(
  userId: string,
  input: CreateTaskInput
): Promise<TaskWithRelations> {
  const validatedInput = CreateTaskInputSchema.parse(input);
  const { tagIds, recurrenceRule, ...taskData } = validatedInput;

  logger.info("Creating task", { userId, title: taskData.title }, LOG_SOURCE);

  // Normalize and validate recurrence rule if provided
  let standardizedRecurrenceRule: string | null = null;
  if (recurrenceRule) {
    try {
      const normalized = normalizeRecurrenceRule(recurrenceRule);
      if (normalized) {
        // Attempt to parse the standardized RRule string to validate it
        RRule.fromString(normalized);
        standardizedRecurrenceRule = normalized;
      }
    } catch (error) {
      logger.error(
        "Error parsing recurrence rule",
        {
          error: error instanceof Error ? error.message : String(error),
          recurrenceRule,
        },
        LOG_SOURCE
      );
      throw new Error("Invalid recurrence rule");
    }
  }

  // Find the project's task mapping if it exists
  let mappingId: string | null = null;
  if (taskData.projectId) {
    const mapping = await prisma.taskListMapping.findFirst({
      where: {
        projectId: taskData.projectId,
      },
    });
    if (mapping) {
      mappingId = mapping.id;
    }
  }

  const task = await prisma.task.create({
    data: {
      ...taskData,
      userId,
      isRecurring: !!recurrenceRule,
      recurrenceRule: standardizedRecurrenceRule,
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

  // Track the creation for sync purposes if the task is in a mapped project
  if (mappingId) {
    try {
      const changeTracker = new TaskChangeTracker();
      await changeTracker.trackChange(
        task.id,
        "CREATE" as ChangeType,
        userId,
        { task },
        undefined, // providerId will be determined later during sync
        mappingId
      );

      logger.info(
        `Tracked CREATE change for task ${task.id} in mapping ${mappingId}`,
        {
          taskId: task.id,
          mappingId,
        },
        LOG_SOURCE
      );
    } catch (error) {
      logger.error(
        "Failed to track task creation for sync",
        {
          error: error instanceof Error ? error.message : String(error),
          taskId: task.id,
          mappingId,
        },
        LOG_SOURCE
      );
      // Don't fail the task creation if sync tracking fails
    }
  }

  logger.info(
    "Task created successfully",
    { userId, taskId: task.id, title: task.title },
    LOG_SOURCE
  );

  return task;
}

/**
 * Update an existing task
 */
export async function updateTask(
  userId: string,
  taskId: string,
  input: UpdateTaskInput
): Promise<TaskWithRelations> {
  const validatedInput = UpdateTaskInputSchema.parse(input);
  const { tagIds, recurrenceRule, ...updates } = validatedInput;

  logger.info("Updating task", { userId, taskId }, LOG_SOURCE);

  // First, get the existing task
  const existingTask = await prisma.task.findUnique({
    where: {
      id: taskId,
      userId,
    },
    include: {
      tags: true,
    },
  });

  if (!existingTask) {
    logger.warn(
      "Task update failed - task not found",
      { userId, taskId },
      LOG_SOURCE
    );
    throw new Error("Task not found");
  }

  // Handle recurrence rule updates
  let standardizedRecurrenceRule: string | null = null;
  if (recurrenceRule !== undefined) {
    if (recurrenceRule) {
      try {
        const normalized = normalizeRecurrenceRule(recurrenceRule);
        if (normalized) {
          RRule.fromString(normalized);
          standardizedRecurrenceRule = normalized;
        }
      } catch (error) {
        logger.error(
          "Error parsing recurrence rule",
          {
            error: error instanceof Error ? error.message : String(error),
            recurrenceRule,
          },
          LOG_SOURCE
        );
        throw new Error("Invalid recurrence rule");
      }
    }
  }

  // Set completedAt when task is marked as completed
  if (updates.status === "COMPLETED" && existingTask.status !== "COMPLETED") {
    updates.completedAt = newDate();
  }

  // Handle recurring task completion
  if (
    existingTask.isRecurring &&
    updates.status === "COMPLETED" &&
    existingTask.recurrenceRule
  ) {
    try {
      // Normalize the recurrence rule to ensure compatibility with RRule
      const standardRecurrenceRule = normalizeRecurrenceRule(
        existingTask.recurrenceRule
      );

      if (standardRecurrenceRule) {
        const rrule = RRule.fromString(standardRecurrenceRule);

        // For tasks, we only care about the date part
        const baseDate = newDate(existingTask.dueDate || newDate());
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
          if (existingTask.startDate && existingTask.dueDate) {
            // Calculate the number of days between the original start and due dates
            const startToDueDelta = Math.round(
              (existingTask.dueDate.getTime() -
                existingTask.startDate.getTime()) /
                (1000 * 60 * 60 * 24)
            );

            // Apply the same delta to the new due date to get the new start date
            const newStartDate = new Date(nextOccurrence);
            newStartDate.setDate(newStartDate.getDate() - startToDueDelta);
            nextStartDate = newStartDate;

            logger.info(
              "Calculated new start date for recurring task",
              {
                taskId: existingTask.id,
                originalStartDate: existingTask.startDate?.toISOString(),
                originalDueDate: existingTask.dueDate?.toISOString(),
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
              title: existingTask.title,
              description: existingTask.description,
              status: "COMPLETED",
              dueDate: baseDate, // Use the original due date for the completed instance
              startDate: existingTask.startDate, // Use the original start date for the completed instance
              duration: existingTask.duration,
              priority: existingTask.priority,
              energyLevel: existingTask.energyLevel,
              preferredTime: existingTask.preferredTime,
              projectId: existingTask.projectId,
              isRecurring: false,
              completedAt: newDate(), // Set completedAt for the completed instance
              userId,
              tags: {
                connect: existingTask.tags.map((tag) => ({ id: tag.id })),
              },
            },
          });

          // Update the recurring task with new due date and reset status
          updates.dueDate = nextOccurrence;
          updates.startDate = nextStartDate; // Update the start date if calculated
          updates.status = "TODO";
        }
      }
    } catch (error) {
      logger.error(
        "Error handling recurring task completion",
        {
          error: error instanceof Error ? error.message : String(error),
          taskId,
        },
        LOG_SOURCE
      );
      // Continue with normal update if recurring logic fails
    }
  }

  // Prepare update data with proper typing
  const updateData = {
    ...updates,
    ...(recurrenceRule !== undefined && {
      recurrenceRule: standardizedRecurrenceRule,
      isRecurring: !!standardizedRecurrenceRule,
    }),
    ...(tagIds !== undefined && {
      tags: {
        set: tagIds.map((id: string) => ({ id })),
      },
    }),
  };

  const updatedTask = await prisma.task.update({
    where: {
      id: taskId,
      userId,
    },
    data: updateData,
    include: {
      tags: true,
      project: true,
    },
  });

  // Track the update for sync purposes if the task is in a mapped project
  const mappingId = await getMappingIdForTask(taskId);
  if (mappingId) {
    try {
      const changeTracker = new TaskChangeTracker();
      await changeTracker.trackChange(
        taskId,
        "UPDATE" as ChangeType,
        userId,
        { task: updatedTask },
        undefined,
        mappingId
      );

      logger.info(
        `Tracked UPDATE change for task ${taskId} in mapping ${mappingId}`,
        {
          taskId,
          mappingId,
        },
        LOG_SOURCE
      );
    } catch (error) {
      logger.error(
        "Failed to track task update for sync",
        {
          error: error instanceof Error ? error.message : String(error),
          taskId,
          mappingId,
        },
        LOG_SOURCE
      );
      // Don't fail the task update if sync tracking fails
    }
  }

  logger.info(
    "Task updated successfully",
    { userId, taskId, title: updatedTask.title },
    LOG_SOURCE
  );

  return updatedTask;
}

/**
 * Delete a task
 */
export async function deleteTask(
  userId: string,
  taskId: string
): Promise<{ success: boolean }> {
  logger.info("Deleting task", { userId, taskId }, LOG_SOURCE);

  // First, check if the task exists and belongs to the user
  const existingTask = await prisma.task.findUnique({
    where: {
      id: taskId,
      userId,
    },
  });

  if (!existingTask) {
    logger.warn(
      "Task deletion failed - task not found",
      { userId, taskId },
      LOG_SOURCE
    );
    throw new Error("Task not found");
  }

  // Track the deletion for sync purposes if the task is in a mapped project
  const mappingId = await getMappingIdForTask(taskId);
  if (mappingId) {
    try {
      const changeTracker = new TaskChangeTracker();
      await changeTracker.trackChange(
        taskId,
        "DELETE" as ChangeType,
        userId,
        { task: existingTask },
        undefined,
        mappingId
      );

      logger.info(
        `Tracked DELETE change for task ${taskId} in mapping ${mappingId}`,
        {
          taskId,
          mappingId,
        },
        LOG_SOURCE
      );
    } catch (error) {
      logger.error(
        "Failed to track task deletion for sync",
        {
          error: error instanceof Error ? error.message : String(error),
          taskId,
          mappingId,
        },
        LOG_SOURCE
      );
      // Continue with deletion even if sync tracking fails
    }
  }

  await prisma.task.delete({
    where: {
      id: taskId,
      userId,
    },
  });

  logger.info(
    "Task deleted successfully",
    { userId, taskId, taskTitle: existingTask.title },
    LOG_SOURCE
  );

  return { success: true };
}

/**
 * Normalize a recurrence rule
 */
export async function normalizeRecurrence(
  input: NormalizeRecurrenceInput
): Promise<{ normalizedRule: string }> {
  const { recurrenceRule } = NormalizeRecurrenceInputSchema.parse(input);

  logger.info("Normalizing recurrence rule", { recurrenceRule }, LOG_SOURCE);

  try {
    const normalizedRule = normalizeRecurrenceRule(recurrenceRule);

    if (!normalizedRule) {
      throw new Error("Failed to normalize recurrence rule");
    }

    // Validate the normalized rule
    RRule.fromString(normalizedRule);

    logger.info(
      "Recurrence rule normalized successfully",
      {
        original: recurrenceRule,
        normalized: normalizedRule,
      },
      LOG_SOURCE
    );

    return { normalizedRule };
  } catch (error) {
    logger.error(
      "Error normalizing recurrence rule",
      {
        error: error instanceof Error ? error.message : String(error),
        recurrenceRule,
      },
      LOG_SOURCE
    );
    throw new Error("Invalid recurrence rule");
  }
}

/**
 * Schedule all tasks (placeholder - actual implementation would be complex)
 */
export async function scheduleAllTasks(
  userId: string,
  input: ScheduleAllTasksInput = { forceReschedule: false }
): Promise<{ scheduledCount: number; message: string }> {
  const { forceReschedule } = ScheduleAllTasksInputSchema.parse(input);

  logger.info(
    "Scheduling all tasks for user",
    { userId, forceReschedule },
    LOG_SOURCE
  );

  // TODO: Implement actual scheduling logic
  // This would involve complex algorithms to schedule tasks based on:
  // - Available time slots
  // - Task priorities and energy levels
  // - User preferences and calendar events
  // - Task dependencies and constraints

  logger.info("Task scheduling completed", { userId }, LOG_SOURCE);

  return {
    scheduledCount: 0,
    message:
      "Task scheduling functionality will be implemented in the business logic layer",
  };
}

/**
 * Helper function to get mapping ID for a task
 */
async function getMappingIdForTask(taskId: string): Promise<string | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true },
  });

  if (!task?.projectId) {
    return null;
  }

  const mapping = await prisma.taskListMapping.findFirst({
    where: {
      projectId: task.projectId,
    },
    select: { id: true },
  });

  return mapping?.id || null;
}
