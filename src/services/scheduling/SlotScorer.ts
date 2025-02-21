import { TimeSlot, SlotScore, EnergyLevel } from "@/types/scheduling";
import { AutoScheduleSettings, Task } from "@prisma/client";
import { getEnergyLevelForTime } from "@/lib/autoSchedule";
import {
  differenceInMinutes,
  differenceInHours,
  newDate,
} from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { Priority } from "@/types/task";

interface ProjectTask {
  start: Date;
  end: Date;
}

export class SlotScorer {
  constructor(
    private settings: AutoScheduleSettings,
    private scheduledTasks: Map<string, ProjectTask[]> = new Map()
  ) {
    logger.log("[DEBUG] SlotScorer constructor");
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
    logger.log("[DEBUG] scoreSlot inputs:", {
      slot: {
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
        isWithinWorkHours: slot.isWithinWorkHours,
        hasBufferTime: slot.hasBufferTime,
        energyLevel: slot.energyLevel,
      },
      task: {
        id: task.id,
        title: task.title,
        dueDate: task.dueDate?.toISOString(),
        energyLevel: task.energyLevel,
        preferredTime: task.preferredTime,
        priority: task.priority,
        projectId: task.projectId,
      },
    });

    const factors = {
      workHourAlignment: this.scoreWorkHourAlignment(slot),
      energyLevelMatch: this.scoreEnergyLevelMatch(slot, task),
      projectProximity: this.scoreProjectProximity(slot, task),
      bufferAdequacy: this.scoreBufferAdequacy(slot),
      timePreference: this.scoreTimePreference(slot, task),
      deadlineProximity: this.scoreDeadlineProximity(slot, task),
      priorityScore: this.scorePriority(task),
    };

    // Calculate total score (weighted average)
    const weights = {
      workHourAlignment: 1.0,
      energyLevelMatch: 1.5,
      projectProximity: 0.5,
      bufferAdequacy: 0.8,
      timePreference: 1.2,
      deadlineProximity: 3.0,
      priorityScore: 1.8,
    };

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const weightedSum = Object.entries(factors).reduce((sum, [key, value]) => {
      const weight = weights[key as keyof typeof weights];
      const contribution = value * weight;
      logger.log(`[DEBUG] Factor contribution for ${key}:`, {
        value,
        weight,
        contribution,
        percentOfTotal: ((contribution / totalWeight) * 100).toFixed(2) + "%",
      });
      return sum + contribution;
    }, 0);

    const total = weightedSum / totalWeight;

    logger.log("[DEBUG] Final score calculation:", {
      totalWeight,
      weightedSum,
      total,
      factors,
    });

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

    const slotEnergy = getEnergyLevelForTime(
      slot.start.getHours(),
      this.settings
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
      const hour = slot.start.getHours();
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

    logger.log("[DEBUG] scoreDeadlineProximity inputs:", {
      slot: {
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
      },
      task: {
        dueDate: task.dueDate.toISOString(),
        minutesOverdue,
        isOverdue: minutesOverdue > 0,
      },
    });

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

      logger.log("[DEBUG] Overdue task scoring details:", {
        daysOverdue,
        baseScore,
        minutesToSlot,
        daysToSlot,
        timePenalty,
        finalScore: baseScore * (1 - timePenalty),
      });

      // Apply penalty as a multiplier to preserve relative scoring
      return baseScore * (1 - timePenalty);
    }

    // For future tasks (unchanged)
    const minutesToDeadline = differenceInMinutes(task.dueDate, slot.start);
    const daysToDeadline = minutesToDeadline / (24 * 60);
    const score = Math.min(0.99, Math.exp(-daysToDeadline / 3));

    logger.log("[DEBUG] Future task scoring details:", {
      daysToDeadline,
      score,
    });

    return score;
  }

  private scoreProjectProximity(slot: TimeSlot, task: Task): number {
    if (!task.projectId || !this.settings.groupByProject) return 0.5;

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

  private scorePriority(task: Task): number {
    if (!task.priority || task.priority === Priority.NONE) return 0.25;

    // Higher priority tasks get higher scores
    switch (task.priority) {
      case Priority.HIGH:
        return 1.0;
      case Priority.MEDIUM:
        return 0.75;
      case Priority.LOW:
        return 0.5;
      default:
        return 0.25;
    }
  }
}
