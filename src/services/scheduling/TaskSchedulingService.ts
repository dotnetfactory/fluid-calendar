import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import { ProjectStatus } from "@/types/project";
import {
  EnergyLevel,
  Priority,
  TaskStatus,
  TaskWithRelations,
  TimePreference,
} from "@/types/task";

import { CalendarServiceImpl } from "./CalendarServiceImpl";
import { groupTasksBySchedule, loadSchedules } from "./ScheduleResolver";
import { SchedulingService } from "./SchedulingService";

const LOG_SOURCE = "TaskSchedulingService";

// Define a type for the database result
type DbTaskWithRelations = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: Date | null;
  duration: number | null;
  priority: string | null;
  energyLevel: string | null;
  preferredTime: string | null;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
  recurrenceRule: string | null;
  lastCompletedDate: Date | null;
  completedAt: Date | null;
  isRecurring: boolean;
  isAutoScheduled: boolean;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  scheduleScore: number | null;
  lastScheduled: Date | null;
  scheduleLocked: boolean;
  postponedUntil: Date | null;
  userId: string;
  tags: {
    id: string;
    name: string;
    color: string | null;
    userId: string | null;
  }[];
  project: {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string | null;
  } | null;
};

/**
 * Convert database task to TaskWithRelations
 */
function convertDbTaskToTaskWithRelations(
  dbTask: DbTaskWithRelations
): TaskWithRelations {
  return {
    ...dbTask,
    status: dbTask.status as TaskStatus,
    priority: dbTask.priority as Priority | null,
    energyLevel: dbTask.energyLevel as EnergyLevel | null,
    preferredTime: dbTask.preferredTime as TimePreference | null,
    tags: dbTask.tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color || undefined,
    })),
    project: dbTask.project
      ? {
          ...dbTask.project,
          status: dbTask.project.status as ProjectStatus,
        }
      : null,
  };
}

/**
 * Schedule all tasks for a user using multi-schedule resolution.
 * Groups tasks by their resolved schedule, processes named schedules first,
 * then 24/7 system schedule last. Cross-schedule conflicts are shared.
 */
export async function scheduleAllTasksForUser(
  userId: string,
  fullRebalance: boolean = false
): Promise<TaskWithRelations[]> {
  try {
    logger.info("Starting task scheduling for user", { userId }, LOG_SOURCE);

    // Load all schedules for the user
    const { schedules: allSchedules, byId: scheduleMap, systemSchedule } =
      await loadSchedules(userId);

    // Check if groupByProject is enabled (still on AutoScheduleSettings for now)
    const autoSettings = await prisma.autoScheduleSettings.findUnique({
      where: { userId },
    });
    const groupByProject = autoSettings?.groupByProject ?? false;

    // Get all tasks marked for auto-scheduling that are not locked or blocked
    const tasksToSchedule = await prisma.task.findMany({
      where: {
        isAutoScheduled: true,
        scheduleLocked: false,
        isBlocked: false,
        status: {
          not: { in: [TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS] },
        },
        userId,
      },
      include: { project: true, tags: true },
    });

    // Get locked tasks (global, all schedules -- they block time everywhere)
    const lockedTasks = await prisma.task.findMany({
      where: {
        isAutoScheduled: true,
        scheduleLocked: true,
        status: {
          not: { in: [TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS] },
        },
        userId,
      },
      include: { project: true, tags: true },
    });

    logger.info(
      "Found tasks to schedule",
      {
        tasksToScheduleCount: tasksToSchedule.length,
        lockedTasksCount: lockedTasks.length,
        scheduleCount: allSchedules.length,
      },
      LOG_SOURCE
    );

    // Clear existing schedules for non-locked tasks
    if (tasksToSchedule.length > 0) {
      await prisma.task.updateMany({
        where: {
          id: { in: tasksToSchedule.map((t) => t.id) },
          userId,
        },
        data: {
          scheduledStart: null,
          scheduledEnd: null,
          scheduleScore: null,
        },
      });
    }

    // Group tasks by resolved schedule (named first, 24/7 last)
    const scheduleGroups = groupTasksBySchedule(
      tasksToSchedule,
      scheduleMap,
      systemSchedule
    );

    // Shared calendar service (event cache shared across all groups)
    const calendarService = new CalendarServiceImpl();

    // Shared conflict map: seeded with locked tasks, grows as groups are scheduled
    const sharedConflicts = new Map<string, { start: Date; end: Date }[]>();
    for (const task of lockedTasks) {
      if (task.scheduledStart && task.scheduledEnd) {
        const key = task.projectId || "none";
        const list = sharedConflicts.get(key) || [];
        list.push({ start: task.scheduledStart, end: task.scheduledEnd });
        sharedConflicts.set(key, list);
      }
    }

    const allUpdatedTaskIds: string[] = [];

    // Process each schedule group
    for (const group of scheduleGroups) {
      logger.info(
        `Scheduling ${group.tasks.length} tasks for schedule "${group.schedule.name}"`,
        { scheduleId: group.schedule.id, taskCount: group.tasks.length },
        LOG_SOURCE
      );

      const schedulingService = new SchedulingService(
        group.schedule,
        calendarService,
        groupByProject,
        fullRebalance
      );

      // Include locked tasks in the group so they show as conflicts
      const groupWithLocked = [...group.tasks, ...lockedTasks];
      const updatedTasks = await schedulingService.scheduleMultipleTasks(
        groupWithLocked,
        userId,
        sharedConflicts
      );

      // Add newly scheduled tasks to shared conflicts for next group
      for (const task of updatedTasks) {
        if (task.scheduledStart && task.scheduledEnd && !task.scheduleLocked) {
          const key = task.projectId || "none";
          const list = sharedConflicts.get(key) || [];
          list.push({ start: task.scheduledStart, end: task.scheduledEnd });
          sharedConflicts.set(key, list);
        }
      }

      // Collect non-locked task IDs
      for (const t of updatedTasks) {
        if (!t.scheduleLocked) allUpdatedTaskIds.push(t.id);
      }
    }

    // Update lastScheduled timestamp
    const allTaskIds = [
      ...allUpdatedTaskIds,
      ...lockedTasks.map((t) => t.id),
    ];

    if (allTaskIds.length > 0) {
      await prisma.task.updateMany({
        where: { id: { in: allTaskIds } },
        data: { lastScheduled: new Date() },
      });
    }

    // Fetch final results with relations
    const dbTasks = (await prisma.task.findMany({
      where: { id: { in: allTaskIds }, userId },
      include: { tags: true, project: true },
    })) as DbTaskWithRelations[];

    const tasksWithRelations = dbTasks.map(convertDbTaskToTaskWithRelations);

    logger.info(
      "Task scheduling completed successfully",
      {
        userId,
        tasksScheduled: allUpdatedTaskIds.length,
        scheduleGroups: scheduleGroups.length,
      },
      LOG_SOURCE
    );

    return tasksWithRelations;
  } catch (error) {
    logger.error(
      "Error scheduling tasks",
      {
        error: error instanceof Error ? error.message : String(error),
        userId,
      },
      LOG_SOURCE
    );
    throw error;
  }
}
