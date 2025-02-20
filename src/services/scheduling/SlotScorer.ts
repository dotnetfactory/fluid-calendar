import { TimeSlot, SlotScore, EnergyLevel } from "@/types/scheduling";
import { AutoScheduleSettings, Task } from "@prisma/client";
import { getEnergyLevelForTime } from "@/lib/autoSchedule";
import { differenceInMinutes, differenceInHours } from "@/lib/date-utils";
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
    // logger.log("[DEBUG] Scoring slot:", {
    //   slot: {
    //     start: slot.start.toISOString(),
    //     end: slot.end.toISOString(),
    //   },
    //   task: {
    //     id: task.id,
    //     title: task.title,
    //     dueDate: task.dueDate?.toISOString(),
    //     energyLevel: task.energyLevel,
    //     preferredTime: task.preferredTime,
    //     projectId: task.projectId,
    //   },
    // });

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
      deadlineProximity: 2.0,
      priorityScore: 1.8, // High weight for priority
    };

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const weightedSum = Object.entries(factors).reduce(
      (sum, [key, value]) => sum + value * weights[key as keyof typeof weights],
      0
    );

    const total = weightedSum / totalWeight;

    // logger.log("[DEBUG] Slot score details:", {
    //   slot: {
    //     start: slot.start.toISOString(),
    //     end: slot.end.toISOString(),
    //   },
    //   factors,
    //   weights,
    //   totalWeight,
    //   weightedSum,
    //   total,
    // });

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
    if (!task.preferredTime) return 0.5; // Neutral score if no preference

    const hour = slot.start.getHours();
    const preference = task.preferredTime.toLowerCase();

    // Define time ranges
    const ranges = {
      morning: { start: 5, end: 12 },
      afternoon: { start: 12, end: 17 },
      evening: { start: 17, end: 22 },
    };

    const range = ranges[preference as keyof typeof ranges];
    return hour >= range.start && hour < range.end ? 1 : 0;
  }

  private scoreDeadlineProximity(slot: TimeSlot, task: Task): number {
    if (!task.dueDate) {
      // logger.log("[DEBUG] No due date for task, using neutral deadline score", {
      //   taskId: task.id,
      //   score: 0.5,
      // });
      return 0.5;
    }

    const minutesToDeadline = differenceInMinutes(task.dueDate, slot.end);
    if (minutesToDeadline < 0) {
      // logger.log("[DEBUG] Slot is past deadline", {
      //   taskId: task.id,
      //   slotEnd: slot.end.toISOString(),
      //   dueDate: task.dueDate.toISOString(),
      //   score: 0,
      // });
      return 0;
    }

    const dayInMinutes = 24 * 60;
    const daysToDeadline = minutesToDeadline / dayInMinutes;
    const score = Math.min(1, Math.exp(-daysToDeadline / 7));

    // logger.log("[DEBUG] Deadline proximity score", {
    //   taskId: task.id,
    //   slotEnd: slot.end.toISOString(),
    //   dueDate: task.dueDate.toISOString(),
    //   daysToDeadline,
    //   score,
    // });

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
    if (!task.priority || task.priority === Priority.NONE) return 0.5;

    // Higher priority tasks get higher scores
    switch (task.priority) {
      case Priority.HIGH:
        return 1.0;
      case Priority.MEDIUM:
        return 0.7;
      case Priority.LOW:
        return 0.4;
      default:
        return 0.5;
    }
  }
}
