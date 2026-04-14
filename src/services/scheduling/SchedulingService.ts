import { AutoScheduleSettings, Task } from "@prisma/client";

import { addDays, newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import { CalendarServiceImpl } from "./CalendarServiceImpl";
import { TimeSlotManager, TimeSlotManagerImpl } from "./TimeSlotManager";

// Import the global Prisma instance

const DEFAULT_TASK_DURATION = 30; // Default duration in minutes
const LOG_SOURCE = "SchedulingService";

interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, string | number | Date | boolean>;
}

export class SchedulingService {
  private calendarService: CalendarServiceImpl;
  private settings: AutoScheduleSettings | null;
  private timeZone: string;
  private metrics: PerformanceMetrics[] = [];

  constructor(settings?: AutoScheduleSettings, timeZone?: string) {
    this.calendarService = new CalendarServiceImpl();
    this.settings = settings || null;
    this.timeZone = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  private startMetric(
    operation: string,
    metadata?: Record<string, string | number | Date | boolean>
  ): number {
    const startTime = performance.now();
    this.metrics.push({ operation, startTime, metadata });
    return startTime;
  }

  private endMetric(operation: string, startTime: number) {
    const endTime = performance.now();
    const metricIndex = this.metrics.findIndex(
      (m) => m.operation === operation && m.startTime === startTime
    );
    if (metricIndex !== -1) {
      this.metrics[metricIndex].endTime = endTime;
      this.metrics[metricIndex].duration = endTime - startTime;
    }
  }

  private logMetrics() {
    const totalDuration =
      this.metrics[this.metrics.length - 1].endTime! -
      this.metrics[0].startTime;

    logger.debug(
      "Scheduling Performance Metrics",
      {
        metadata: {
          data: {
            totalDuration: `${(totalDuration / 1000).toFixed(2)}s`,
            operations: JSON.stringify(
              this.metrics.map((m) => ({
                operation: m.operation,
                duration: m.duration
                  ? `${(m.duration / 1000).toFixed(2)}s`
                  : "incomplete",
                percentage: m.duration
                  ? `${((m.duration / totalDuration) * 100).toFixed(1)}%`
                  : "n/a",
                metadata: m.metadata,
              }))
            ),
          },
        },
      },
      LOG_SOURCE
    );

    // Reset metrics for next run
    this.metrics = [];
  }

  private getTimeSlotManager(): TimeSlotManagerImpl {
    const startTime = this.startMetric("getTimeSlotManager");

    if (!this.settings) {
      throw new Error("AutoScheduleSettings must be provided to SchedulingService");
    }

    const manager = new TimeSlotManagerImpl(this.settings, this.calendarService, this.timeZone);

    this.endMetric("getTimeSlotManager", startTime);
    return manager;
  }

  async scheduleMultipleTasks(tasks: Task[], userId: string): Promise<Task[]> {
    const overallStart = this.startMetric("scheduleMultipleTasks", {
      totalTasks: tasks.length,
    });

    // Clear existing schedules for non-locked tasks
    const tasksToSchedule = tasks.filter((t) => !t.scheduleLocked);

    // Get initial scores for all tasks
    const timeSlotManager = this.getTimeSlotManager();
    const now = newDate();

    const scoringStart = this.startMetric("calculateInitialScores", {
      tasksToScore: tasksToSchedule.length,
    });

    const initialScores = new Map<string, number>();

    //TODO: move to utils
    // Use the same windows as scheduling
    const windows = [
      { days: 7, label: "1 week" },
      // { days: 14, label: "2 weeks" },
      // { days: 30, label: "1 month" },
    ];

    // Process tasks in parallel batches
    const batchSize = 8;
    for (let i = 0; i < tasksToSchedule.length; i += batchSize) {
      const batch = tasksToSchedule.slice(i, i + batchSize);
      const batchPromises = batch.map(async (task) => {
        const taskStart = this.startMetric("calculateTaskScore", {
          taskId: task.id,
          title: task.title,
        });

        let bestScore = 0;
        for (const window of windows) {
          const slots = await timeSlotManager.findAvailableSlots(
            task,
            now,
            addDays(now, window.days),
            userId
          );
          if (slots.length > 0) {
            bestScore = Math.max(bestScore, slots[0].score);
            break; // Found a slot, no need to look further
          }
        }

        this.endMetric("calculateTaskScore", taskStart);
        return { taskId: task.id, score: bestScore };
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach((result) => {
        initialScores.set(result.taskId, result.score);
      });
    }

    this.endMetric("calculateInitialScores", scoringStart);

    // Sort tasks: priority tier first, then by best slot score within tier
    this.startMetric("sortTasks");
    const priorityRank: Record<string, number> = {
      high: 0,
      medium: 1,
      low: 2,
      none: 3,
    };
    const sortedTasks = [...tasksToSchedule].sort((a, b) => {
      const aPriority = priorityRank[a.priority || "none"] ?? 3;
      const bPriority = priorityRank[b.priority || "none"] ?? 3;
      if (aPriority !== bPriority) {
        return aPriority - bPriority; // Higher priority first (lower rank number)
      }
      const aScore = initialScores.get(a.id) || 0;
      const bScore = initialScores.get(b.id) || 0;
      return bScore - aScore; // Higher scores first within same priority
    });

    const schedulingStart = this.startMetric("scheduleTasks", {
      tasksToSchedule: sortedTasks.length,
    });

    const updatedTasks: Task[] = [];

    // Schedule each task
    for (const task of sortedTasks) {
      // Tasks with no duration or < 1 min are reminders, not schedulable blocks
      if (!task.duration || task.duration < 1) {
        continue;
      }

      const taskStart = this.startMetric("scheduleIndividualTask", {
        taskId: task.id,
        title: task.title,
      });

      const taskWithDuration = {
        ...task,
        duration: task.duration,
      };

      const scheduledTask = await this.scheduleTask(
        taskWithDuration,
        timeSlotManager,
        userId
      );
      if (scheduledTask) {
        updatedTasks.push(scheduledTask);
      }

      this.endMetric("scheduleIndividualTask", taskStart);
    }

    this.endMetric("scheduleTasks", schedulingStart);

    // Get all tasks (including locked ones) to return
    const finalFetchStart = this.startMetric("fetchFinalTasks");
    const allTasks = await prisma.task.findMany({
      where: {
        id: {
          in: tasks.map((t) => t.id),
        },
        userId,
      },
    });
    this.endMetric("fetchFinalTasks", finalFetchStart);

    this.endMetric("scheduleMultipleTasks", overallStart);
    this.logMetrics();

    return allTasks;
  }

  private async scheduleTask(
    task: Task,
    timeSlotManager: TimeSlotManager,
    userId: string
  ): Promise<Task | null> {
    const taskStart = this.startMetric("scheduleTask", {
      taskId: task.id,
      title: task.title,
    });

    const now = newDate();
    const windows = [
      { days: 7, label: "1 week" },
      // { days: 14, label: "2 weeks" },
      // { days: 30, label: "1 month" },
    ];

    for (const window of windows) {
      const windowStart = this.startMetric("tryWindow", {
        window: window.label,
        taskId: task.id,
      });

      const endDate = addDays(now, window.days);
      const availableSlots = await timeSlotManager.findAvailableSlots(
        task,
        now,
        endDate,
        userId
      );

      if (availableSlots.length > 0) {
        const bestSlot = availableSlots[0]; // Already sorted by score

        const updateStart = this.startMetric("updateTask", {
          taskId: task.id,
          slotStart: bestSlot.start,
          slotEnd: bestSlot.end,
        });

        // Update the task with the selected slot
        const updatedTask = await prisma.task.update({
          where: { id: task.id },
          data: {
            scheduledStart: bestSlot.start,
            scheduledEnd: bestSlot.end,
            isAutoScheduled: true,
            duration: task.duration || DEFAULT_TASK_DURATION,
            scheduleScore: bestSlot.score,
            userId,
          },
        });

        // Add this newly scheduled task to the list of conflicts
        // so it won't be available for other tasks
        await timeSlotManager.addScheduledTaskConflict(updatedTask);

        this.endMetric("updateTask", updateStart);
        this.endMetric("tryWindow", windowStart);
        this.endMetric("scheduleTask", taskStart);
        return updatedTask;
      } else {
        logger.debug(
          `No available slots found in ${window.label} window`,
          {
            windowLabel: window.label,
          },
          LOG_SOURCE
        );
      }

      this.endMetric("tryWindow", windowStart);
    }

    this.endMetric("scheduleTask", taskStart);
    return null;
  }
}
