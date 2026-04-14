import { Task } from "@prisma/client";

import { addDays, newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import { CalendarServiceImpl } from "./CalendarServiceImpl";
import { ScheduleWithBlocks } from "./ScheduleResolver";
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
  private schedule: ScheduleWithBlocks;
  private metrics: PerformanceMetrics[] = [];
  private groupByProject: boolean;
  private fullRebalance: boolean;

  constructor(
    schedule: ScheduleWithBlocks,
    calendarService: CalendarServiceImpl,
    groupByProject: boolean = false,
    fullRebalance: boolean = false
  ) {
    this.calendarService = calendarService;
    this.schedule = schedule;
    this.groupByProject = groupByProject;
    this.fullRebalance = fullRebalance;
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

  private getTimeSlotManager(
    existingConflicts?: Map<string, { start: Date; end: Date }[]>
  ): TimeSlotManagerImpl {
    const startTime = this.startMetric("getTimeSlotManager");

    const manager = new TimeSlotManagerImpl(
      this.schedule,
      this.calendarService,
      existingConflicts,
      this.groupByProject
    );

    this.endMetric("getTimeSlotManager", startTime);
    return manager;
  }

  async scheduleMultipleTasks(
    tasks: Task[],
    userId: string,
    existingConflicts?: Map<string, { start: Date; end: Date }[]>
  ): Promise<Task[]> {
    const overallStart = this.startMetric("scheduleMultipleTasks", {
      totalTasks: tasks.length,
    });

    // Clear existing schedules for non-locked tasks
    const tasksToSchedule = tasks.filter((t) => !t.scheduleLocked);

    const timeSlotManager = this.getTimeSlotManager(existingConflicts);

    // Sort by priority then due date (skip expensive pre-scoring)
    this.startMetric("sortTasks");
    const priorityRank: Record<string, number> = {
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3,
      none: 4,
    };
    const sortedTasks = [...tasksToSchedule].sort((a, b) => {
      const aPriority = priorityRank[a.priority || "none"] ?? 4;
      const bPriority = priorityRank[b.priority || "none"] ?? 4;
      if (aPriority !== bPriority) return aPriority - bPriority;
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return aDue - bDue;
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
    const windows = this.fullRebalance
      ? [{ days: 14, label: "2 weeks" }, { days: 90, label: "3 months" }]
      : [{ days: 14, label: "2 weeks" }];

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
