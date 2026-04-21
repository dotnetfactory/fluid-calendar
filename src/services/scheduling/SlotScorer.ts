import { Task } from "@prisma/client";

import {
  differenceInHours,
  differenceInMinutes,
  newDate,
  toZonedTime,
} from "@/lib/date-utils";

import { EnergyLevel, SlotScore, TimeSlot } from "@/types/scheduling";

/** Minimal interface for schedule energy level fields */
export interface ScheduleEnergyConfig {
  timezone: string;
  highEnergyStart: number | null;
  highEnergyEnd: number | null;
  mediumEnergyStart: number | null;
  mediumEnergyEnd: number | null;
  lowEnergyStart: number | null;
  lowEnergyEnd: number | null;
}

interface ProjectTask {
  start: Date;
  end: Date;
}

function getEnergyLevelForHour(
  hour: number,
  config: ScheduleEnergyConfig
): "high" | "medium" | "low" | null {
  if (config.highEnergyStart != null && config.highEnergyEnd != null &&
      hour >= config.highEnergyStart && hour < config.highEnergyEnd) return "high";
  if (config.mediumEnergyStart != null && config.mediumEnergyEnd != null &&
      hour >= config.mediumEnergyStart && hour < config.mediumEnergyEnd) return "medium";
  if (config.lowEnergyStart != null && config.lowEnergyEnd != null &&
      hour >= config.lowEnergyStart && hour < config.lowEnergyEnd) return "low";
  return null;
}

export class SlotScorer {
  private groupByProject: boolean;

  constructor(
    private energyConfig: ScheduleEnergyConfig,
    private scheduledTasks: Map<string, ProjectTask[]> = new Map(),
    groupByProject: boolean = false
  ) {
    this.groupByProject = groupByProject;
  }

  // Add method to update scheduled tasks
  updateScheduledTasks(tasks: Task[]) {
    this.scheduledTasks.clear();
    tasks.forEach((task) => {
      if (task.projectId && task.scheduledStart && task.scheduledEnd) {
        const projectTasks = this.scheduledTasks.get(task.projectId) || [];
        projectTasks.push({
          start: task.scheduledStart,
          end: task.scheduledEnd,
        });
        this.scheduledTasks.set(task.projectId, projectTasks);
      }
    });
  }

  scoreSlot(slot: TimeSlot, task: Task): SlotScore {
    const factors = {
      workHourAlignment: this.scoreWorkHourAlignment(slot),
      energyLevelMatch: this.scoreEnergyLevelMatch(slot, task),
      projectProximity: this.scoreProjectProximity(slot, task),
      bufferAdequacy: this.scoreBufferAdequacy(slot),
      timePreference: this.scoreTimePreference(slot, task),
      deadlineProximity: this.scoreDeadlineProximity(slot, task),
    };

    // Weights are base values; deadlineProximity is dropped entirely for tasks
    // without a due date so its 3.0 weight doesn't dilute the other factors.
    // priorityScore is intentionally absent: it depends on task only, not slot,
    // so it cannot affect slot ranking. Priority is applied at the task-ordering
    // step (see SchedulingService.scheduleMultipleTasks).
    const weights: Record<keyof typeof factors, number> = {
      workHourAlignment: 1.0,
      energyLevelMatch: 1.5,
      projectProximity: 0.5,
      bufferAdequacy: 0.8,
      timePreference: 1.2,
      deadlineProximity: task.dueDate ? 3.0 : 0,
    };

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const weightedSum = Object.entries(factors).reduce((sum, [key, value]) => {
      const weight = weights[key as keyof typeof weights];
      const contribution = value * weight;
      return sum + contribution;
    }, 0);

    const total = totalWeight > 0 ? weightedSum / totalWeight : 0;

    return {
      total,
      factors,
    };
  }

  private scoreWorkHourAlignment(slot: TimeSlot): number {
    return slot.isWithinWorkHours ? 1 : 0;
  }

  private scoreEnergyLevelMatch(slot: TimeSlot, task: Task): number {
    if (!task.energyLevel) return 0.5; // Neutral score if task has no energy level

    // Use the schedule's timezone for hour extraction so energy windows apply
    // at the user's local time regardless of server timezone.
    const localStart = toZonedTime(slot.start, this.energyConfig.timezone);
    const slotEnergy = getEnergyLevelForHour(
      localStart.getHours(),
      this.energyConfig
    );
    if (!slotEnergy) return 0.5; // Neutral score if time has no energy level

    // Exact match gets 1.0, adjacent levels get 0.5, opposite levels get 0
    const energyLevels: EnergyLevel[] = ["high", "medium", "low"];
    const taskEnergyIndex = energyLevels.indexOf(
      task.energyLevel as EnergyLevel
    );
    const slotEnergyIndex = energyLevels.indexOf(slotEnergy);

    const distance = Math.abs(taskEnergyIndex - slotEnergyIndex);
    return distance === 0 ? 1 : distance === 1 ? 0.5 : 0;
  }

  private scoreBufferAdequacy(slot: TimeSlot): number {
    if (!slot.hasBufferTime) return 0;
    return 1; // For now, simple boolean score
  }

  private scoreTimePreference(slot: TimeSlot, task: Task): number {
    // If task has a specific time preference, use that
    if (task.preferredTime) {
      // Extract hour in the schedule's timezone so morning/afternoon/evening
      // ranges reflect the user's local time.
      const localStart = toZonedTime(slot.start, this.energyConfig.timezone);
      const hour = localStart.getHours();
      const preference = task.preferredTime.toLowerCase();
      const ranges = {
        morning: { start: 5, end: 12 },
        afternoon: { start: 12, end: 17 },
        evening: { start: 17, end: 22 },
      };
      const range = ranges[preference as keyof typeof ranges];
      return hour >= range.start && hour < range.end ? 1 : 0;
    }

    // For tasks without specific time preference, favor earlier slots
    const minutesToSlot = differenceInMinutes(slot.start, newDate());
    const daysToSlot = minutesToSlot / (24 * 60);
    // Use ln(2)/7 as decay rate to get exactly 0.5 after 7 days
    return Math.exp(-(Math.log(2) / 7) * daysToSlot); // Decay to 0.5 over a week
  }

  private scoreDeadlineProximity(slot: TimeSlot, task: Task): number {
    if (!task.dueDate) {
      return 0.5; // Neutral score for no due date
    }

    const now = newDate();
    // First calculate how overdue the task is relative to now (fixed reference point)
    const minutesOverdue = -differenceInMinutes(task.dueDate, now);

    if (minutesOverdue > 0) {
      // For overdue tasks:
      // 1. Calculate base score based on how overdue from NOW (1.0 to 2.0)
      const daysOverdue = minutesOverdue / (24 * 60);
      const maxOverdueScore = 2.0;
      const overdueScaleDays = 14; // Two weeks
      const baseScore = Math.min(
        maxOverdueScore,
        1.0 + daysOverdue / overdueScaleDays
      );

      // 2. Apply time penalty for later slots
      const minutesToSlot = differenceInMinutes(slot.start, now);
      const daysToSlot = minutesToSlot / (24 * 60);
      // Penalty increases with slot distance, max 50% reduction at 2 weeks
      const timePenalty = Math.min(0.5, daysToSlot / 14);

      // Apply penalty as a multiplier to preserve relative scoring
      return baseScore * (1 - timePenalty);
    }

    // For future tasks: favor earlier slots within the available window, with
    // overall magnitude driven by how urgent the deadline is.
    // Previous implementation used exp(-daysToDeadline/3) which scored slots
    // NEAR the deadline higher than earlier ones — causing the scheduler to
    // push tasks to the last minute instead of placing them as early as possible.
    const daysToDeadlineFromNow = -minutesOverdue / (24 * 60); // positive: days until deadline
    const minutesToSlot = differenceInMinutes(slot.start, now);
    const daysToSlot = minutesToSlot / (24 * 60);

    // Slot is past the deadline — give it a low score so the scheduler prefers
    // earlier placements, but not zero in case nothing earlier is available.
    if (daysToSlot >= daysToDeadlineFromNow) {
      return 0.3;
    }

    // Urgency: decays over a week. Tasks due soon score higher overall so
    // they outrank non-urgent tasks when slot capacity is contested.
    const urgency = Math.exp(-daysToDeadlineFromNow / 7);

    // Earliness: 1.0 for a slot right now, 0.0 for a slot at the deadline.
    // Normalized to the available window so tasks with close deadlines still
    // differentiate among their limited slot options.
    const availableWindow = Math.max(daysToDeadlineFromNow, 0.5);
    const earliness = 1 - daysToSlot / availableWindow;

    // Combine: base floor + urgency-weighted earliness.
    // Urgent task + early slot → ~1.0. Far-future task → uniformly low so
    // other factors (energy, preferences) drive placement.
    return Math.min(0.99, 0.3 + 0.7 * urgency * earliness);
  }

  private scoreProjectProximity(slot: TimeSlot, task: Task): number {
    if (!task.projectId || !this.groupByProject) return 0.5;

    const projectTasks = this.scheduledTasks.get(task.projectId);
    if (!projectTasks || projectTasks.length === 0) return 0.5;

    // Find the closest task from the same project
    const hourDistances = projectTasks.map((projectTask) => {
      // Check distance to both start and end of the task
      const distanceToStart = Math.abs(
        differenceInHours(slot.start, projectTask.start)
      );
      const distanceToEnd = Math.abs(
        differenceInHours(slot.end, projectTask.end)
      );
      return Math.min(distanceToStart, distanceToEnd);
    });

    const closestDistance = Math.min(...hourDistances);

    // Score based on proximity (exponential decay)
    // Perfect score (1.0) if within 1 hour
    // 0.7 if within 2 hours
    // 0.5 if within 4 hours
    // Approaches 0 as distance increases
    return Math.exp(-closestDistance / 4);
  }

  // Getter for scheduledTasks to allow TimeSlotManager to update it
  getScheduledTasks(): Map<string, ProjectTask[]> {
    return this.scheduledTasks;
  }
}
