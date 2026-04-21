import { Task } from "@prisma/client";

import { addDays, newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import {
  SchedulerEventLogger,
  SlotSnapshot,
} from "@/services/logging/SchedulerEventLogger";

import { TimeSlot } from "@/types/scheduling";

import { CalendarServiceImpl } from "./CalendarServiceImpl";
import { ScheduleWithBlocks } from "./ScheduleResolver";
import { TimeSlotManagerImpl } from "./TimeSlotManager";

// Import the global Prisma instance

const DEFAULT_TASK_DURATION = 30; // Default duration in minutes
const LOG_SOURCE = "SchedulingService";

function newRunId(): string {
  return (
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `run_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  );
}

function snapshotSlot(slot: TimeSlot): SlotSnapshot | null {
  if (!slot.scoreBreakdown) return null;
  return {
    start: slot.start.toISOString(),
    end: slot.end.toISOString(),
    score: slot.scoreBreakdown.total,
    factors: slot.scoreBreakdown.factors,
  };
}

interface TaskWithRelations extends Task {
  tags?: Array<{ name: string }>;
  project?: {
    id: string;
    area?: { id: string } | null;
  } | null;
}

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
    existingConflicts?: Map<string, { start: Date; end: Date }[]>,
    runId: string = newRunId()
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
        userId,
        runId
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
    timeSlotManager: TimeSlotManagerImpl,
    userId: string,
    runId: string
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

        // Emit SCHEDULE_DECISION event (fire-and-forget)
        this.emitScheduleDecision(
          task,
          userId,
          runId,
          bestSlot,
          availableSlots.slice(1, 6),
          timeSlotManager.getLastPipelineMetrics(),
          window.days
        );

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

  private emitScheduleDecision(
    task: Task,
    userId: string,
    runId: string,
    chosen: TimeSlot,
    alternatives: TimeSlot[],
    pipelineMetrics: {
      candidateSlotsGenerated: number;
      candidateSlotsAfterFiltering: number;
      filterReasons: Record<string, number>;
    },
    searchWindowDays: number
  ): void {
    const chosenSnapshot = snapshotSlot(chosen);
    if (!chosenSnapshot) return; // no score breakdown means we can't log meaningfully

    const altSnapshots = alternatives
      .map(snapshotSlot)
      .filter((s): s is SlotSnapshot => s !== null);

    const taskWithRelations = task as TaskWithRelations;
    const tagNames = taskWithRelations.tags?.map((t) => t.name) ?? [];
    const areaId = taskWithRelations.project?.area?.id ?? null;

    const daysToDeadline = task.dueDate
      ? (task.dueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      : null;

    SchedulerEventLogger.logScheduleDecision(
      { userId, taskId: task.id },
      {
        runId,
        chosen: chosenSnapshot,
        alternatives: altSnapshots,
        taskContext: {
          projectId: task.projectId,
          areaId,
          scheduleId: task.scheduleId,
          tagNames,
          duration: task.duration ?? DEFAULT_TASK_DURATION,
          priority: task.priority ?? null,
          hasDeadline: task.dueDate !== null,
          daysToDeadline,
          energyLevel: task.energyLevel ?? null,
          preferredTime: task.preferredTime ?? null,
          isChunked: false,
        },
        runContext: {
          candidateSlotsGenerated: pipelineMetrics.candidateSlotsGenerated,
          candidateSlotsAfterFiltering:
            pipelineMetrics.candidateSlotsAfterFiltering,
          searchWindowDays,
          filterReasons: pipelineMetrics.filterReasons,
        },
      }
    ).catch((err) => {
      logger.error(
        "Failed to emit SCHEDULE_DECISION",
        { taskId: task.id, error: err instanceof Error ? err.message : String(err) },
        LOG_SOURCE
      );
    });
  }
}
