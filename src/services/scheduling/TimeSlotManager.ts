import { DayBlock, Task } from "@prisma/client";

import { parseSelectedCalendars } from "@/lib/autoSchedule";
import {
  addDays,
  addMinutes,
  areIntervalsOverlapping,
  differenceInHours,
  getDay,
  newDate,
  roundDateUp,
  setHours,
  setMinutes,
  startOfDay,
  toZonedTime,
} from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

import { Conflict, TimeSlot } from "@/types/scheduling";

import { CalendarService } from "./CalendarService";
import { ScheduleWithBlocks } from "./ScheduleResolver";
import { SlotScorer } from "./SlotScorer";

// Import the global Prisma instance

const DEFAULT_TASK_DURATION = 30;

export interface TimeSlotManager {
  findAvailableSlots(
    task: Task,
    startDate: Date,
    endDate: Date,
    userId: string
  ): Promise<TimeSlot[]>;

  isSlotAvailable(slot: TimeSlot, userId: string): Promise<boolean>;

  calculateBufferTimes(slot: TimeSlot): {
    beforeBuffer: TimeSlot;
    afterBuffer: TimeSlot;
  };

  updateScheduledTasks(userId: string): Promise<void>;

  addScheduledTaskConflict(task: Task): Promise<void>;
}

export class TimeSlotManagerImpl implements TimeSlotManager {
  private slotScorer: SlotScorer;
  private timeZone: string;
  private bufferMinutes: number;
  private selectedCalendarsJson: string;
  private dayBlocks: DayBlock[] | null = null;

  constructor(
    private schedule: ScheduleWithBlocks,
    private calendarService: CalendarService,
    existingConflicts?: Map<string, { start: Date; end: Date }[]>,
    groupByProject: boolean = false
  ) {
    this.slotScorer = new SlotScorer(schedule, existingConflicts || new Map(), groupByProject);
    this.timeZone = schedule.timezone;
    this.bufferMinutes = schedule.bufferMinutes;
    this.selectedCalendarsJson = schedule.selectedCalendars;
  }

  async updateScheduledTasks(userId: string): Promise<void> {
    // Fetch all scheduled tasks
    const scheduledTasks = await prisma.task.findMany({
      where: {
        isAutoScheduled: true,
        scheduledStart: { not: null },
        scheduledEnd: { not: null },
        projectId: { not: null },
        userId,
      },
    });

    // Update the slot scorer with the latest scheduled tasks
    this.slotScorer.updateScheduledTasks(scheduledTasks);
  }

  async findAvailableSlots(
    task: Task,
    startDate: Date,
    endDate: Date,
    userId: string
  ): Promise<TimeSlot[]> {
    // Only load scheduled tasks from the database on the first call
    // For subsequent calls, we'll use the in-memory scheduled tasks
    // that have been updated by addScheduledTaskConflict
    if (this.slotScorer.getScheduledTasks().size === 0) {
      await this.updateScheduledTasks(userId);
    }

    // If task has a startDate that is beyond our endDate window, return empty slots
    // These tasks will get picked up in a future scheduling run
    if (task.startDate instanceof Date && task.startDate > endDate) {
      // Skip this task - it will be scheduled in a future run
      return [];
    }

    // Use the latest of: provided startDate, task's startDate, or now
    const now = newDate();
    let effectiveStartDate = startDate;
    if (task.startDate instanceof Date && task.startDate > effectiveStartDate) {
      effectiveStartDate = task.startDate;
    }
    // Never schedule in the past
    if (effectiveStartDate < now) {
      effectiveStartDate = now;
    }

    // Load day blocks once
    // Use start-of-day for the query since DayBlock.date is stored as midnight UTC
    if (!this.dayBlocks) {
      this.dayBlocks = await prisma.dayBlock.findMany({
        where: {
          userId,
          date: { gte: startOfDay(effectiveStartDate), lte: endDate },
        },
      });
    }

    // 1. Generate potential slots
    const potentialSlots = this.generatePotentialSlots(
      task.duration || DEFAULT_TASK_DURATION,
      effectiveStartDate,
      endDate
    );

    // 1b. Filter out day-blocked slots
    const unblockedSlots = this.filterByDayBlocks(potentialSlots);

    // 2. Filter by work hours
    const workHourSlots = this.filterByWorkHours(unblockedSlots);

    // 3. Check calendar conflicts
    const availableSlots = await this.removeConflicts(workHourSlots, task);

    // 4. Apply buffer times
    const slotsWithBuffer = this.applyBufferTimes(availableSlots);

    // 5. Score slots
    const scoredSlots = this.scoreSlots(slotsWithBuffer, task);

    // 6. Sort by score
    const sortedSlots = this.sortByScore(scoredSlots);

    return sortedSlots;
  }

  async isSlotAvailable(slot: TimeSlot, userId: string): Promise<boolean> {
    // Check if the slot is within work hours
    if (!this.isWithinWorkHours(slot)) {
      return false;
    }

    // Check for calendar conflicts
    const conflicts = await this.findCalendarConflicts(slot, userId);
    if (conflicts.length > 0) {
      return false;
    }

    // Check for conflicts with in-memory scheduled tasks
    if (this.hasInMemoryConflict(slot)) {
      return false;
    }

    return true;
  }

  calculateBufferTimes(slot: TimeSlot): {
    beforeBuffer: TimeSlot;
    afterBuffer: TimeSlot;
  } {
    const bufferMinutes = this.bufferMinutes;

    return {
      beforeBuffer: {
        start: addMinutes(slot.start, -bufferMinutes),
        end: slot.start,
        score: 0,
        conflicts: [],
        energyLevel: null,
        isWithinWorkHours: this.isWithinWorkHours({
          start: addMinutes(slot.start, -bufferMinutes),
          end: slot.start,
          score: 0,
          conflicts: [],
          energyLevel: null,
          isWithinWorkHours: false,
          hasBufferTime: false,
        }),
        hasBufferTime: false,
      },
      afterBuffer: {
        start: slot.end,
        end: addMinutes(slot.end, bufferMinutes),
        score: 0,
        conflicts: [],
        energyLevel: null,
        isWithinWorkHours: this.isWithinWorkHours({
          start: slot.end,
          end: addMinutes(slot.end, bufferMinutes),
          score: 0,
          conflicts: [],
          energyLevel: null,
          isWithinWorkHours: false,
          hasBufferTime: false,
        }),
        hasBufferTime: false,
      },
    };
  }

  /**
   * Generates potential time slots for task scheduling.
   *
   * For the first day (today):
   * 1. Starts at the later of:
   *    - Current time + minimum buffer (15 min), rounded up to next 30-min interval
   *    - Work hours start time
   * 2. If the calculated start time is past work hours, moves to next day
   *
   * For future days:
   * - Starts at work hours start time
   *
   * All days:
   * - Generates slots at 30-minute intervals
   * - Each slot has the specified duration
   * - Continues until reaching the end date
   *
   * @param duration - Duration of the task in minutes
   * @param startDate - UTC date to start generating slots from
   * @param endDate - UTC date to stop generating slots at
   * @returns Array of potential time slots
   */
  /**
   * Get time blocks for a specific day of the week.
   * Returns blocks sorted by start time.
   */
  private getBlocksForDay(dayOfWeek: number) {
    return this.schedule.timeBlocks
      .filter((b) => b.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute));
  }

  private generatePotentialSlots(
    duration: number,
    startDate: Date,
    endDate: Date
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const MINIMUM_BUFFER_MINUTES = 15;

    const localStartDate = toZonedTime(startDate, this.timeZone);
    const localEndDate = toZonedTime(endDate, this.timeZone);
    const localNow = toZonedTime(newDate(), this.timeZone);

    // Iterate day by day
    let currentDay = new Date(localStartDate);
    currentDay.setHours(0, 0, 0, 0);

    while (currentDay < localEndDate) {
      const dayOfWeek = currentDay.getDay();
      const blocks = this.getBlocksForDay(dayOfWeek);

      for (const block of blocks) {
        let blockStart = setMinutes(
          setHours(new Date(currentDay), block.startHour),
          block.startMinute
        );
        const blockEnd = setMinutes(
          setHours(new Date(currentDay), block.endHour),
          block.endMinute
        );

        // If today, adjust for current time + buffer
        if (currentDay.toDateString() === localNow.toDateString()) {
          const earliest = addMinutes(localNow, MINIMUM_BUFFER_MINUTES);
          if (earliest > blockStart) {
            blockStart = roundDateUp(earliest);
          }
        }

        // Generate slots within this block
        let slotStart = blockStart;
        while (slotStart < blockEnd) {
          const slotEnd = addMinutes(slotStart, duration);
          if (slotEnd > blockEnd) break; // Don't overflow the block

          slots.push({
            start: newDate(slotStart),
            end: newDate(slotEnd),
            score: 0,
            conflicts: [],
            energyLevel: null,
            isWithinWorkHours: true, // Generated within a block, so always true
            hasBufferTime: false,
          });

          slotStart = addMinutes(slotStart, duration);
        }
      }

      currentDay = addDays(currentDay, 1);
    }

    return slots;
  }

  private filterByDayBlocks(slots: TimeSlot[]): TimeSlot[] {
    if (!this.dayBlocks || this.dayBlocks.length === 0) return slots;

    return slots.filter((slot) => {
      const slotDate = toZonedTime(slot.start, this.timeZone);
      const slotDateStr = `${slotDate.getFullYear()}-${String(slotDate.getMonth() + 1).padStart(2, "0")}-${String(slotDate.getDate()).padStart(2, "0")}`;

      for (const block of this.dayBlocks!) {
        const blockDate = new Date(block.date);
        const blockDateStr = `${blockDate.getUTCFullYear()}-${String(blockDate.getUTCMonth() + 1).padStart(2, "0")}-${String(blockDate.getUTCDate()).padStart(2, "0")}`;

        if (slotDateStr !== blockDateStr) continue;

        // Full day block (blockFrom is null)
        if (!block.blockFrom) return false;

        // Rest of day block - check if slot starts after blockFrom
        if (slot.start >= block.blockFrom) return false;
      }

      return true;
    });
  }

  private filterByWorkHours(slots: TimeSlot[]): TimeSlot[] {
    // Since slots are generated within time blocks, they are already within work hours.
    // This filter is kept for safety in case slots are generated from other sources.
    return slots.filter((slot) => {
      const within = this.isWithinWorkHours(slot);
      if (within) slot.isWithinWorkHours = true;
      return within;
    });
  }

  private isWithinWorkHours(slot: TimeSlot): boolean {
    const localStart = toZonedTime(slot.start, this.timeZone);
    const localEnd = toZonedTime(slot.end, this.timeZone);
    const dayOfWeek = getDay(localStart);
    const blocks = this.getBlocksForDay(dayOfWeek);

    const startMinutes = localStart.getHours() * 60 + localStart.getMinutes();
    const endMinutes = localEnd.getHours() * 60 + localEnd.getMinutes();

    return blocks.some((block) => {
      const blockStartMin = block.startHour * 60 + block.startMinute;
      const blockEndMin = block.endHour * 60 + block.endMinute;
      return startMinutes >= blockStartMin && endMinutes <= blockEndMin;
    });
  }

  private async findCalendarConflicts(
    slot: TimeSlot,
    userId: string
  ): Promise<Conflict[]> {
    const selectedCalendars = parseSelectedCalendars(this.selectedCalendarsJson);
    if (selectedCalendars.length === 0) {
      return [];
    }

    return this.calendarService.findConflicts(slot, selectedCalendars, userId);
  }

  private hasInMemoryConflict(slot: TimeSlot): boolean {
    const bufferMinutes = this.bufferMinutes;
    // Expand the check window by buffer on both sides
    const checkStart = addMinutes(slot.start, -bufferMinutes);
    const checkEnd = addMinutes(slot.end, bufferMinutes);

    // Check all project tasks for conflicts
    for (const [, projectTasks] of this.slotScorer
      .getScheduledTasks()
      .entries()) {
      for (const projectTask of projectTasks) {
        if (
          areIntervalsOverlapping(
            { start: checkStart, end: checkEnd },
            { start: projectTask.start, end: projectTask.end }
          )
        ) {
          return true;
        }
      }
    }
    return false;
  }

  private async removeConflicts(
    slots: TimeSlot[],
    task: Task
  ): Promise<TimeSlot[]> {
    const availableSlots: TimeSlot[] = [];
    const selectedCalendars = parseSelectedCalendars(
      this.selectedCalendarsJson
    );

    const bufferMinutes = this.bufferMinutes;

    // Prepare slots for batch checking with buffer-expanded windows
    const slotsToCheck = slots.map((slot) => ({
      slot: {
        ...slot,
        // Expand conflict check window by buffer on both sides
        start: addMinutes(slot.start, -bufferMinutes),
        end: addMinutes(slot.end, bufferMinutes),
      },
      originalSlot: slot,
      taskId: task.id,
    }));

    // Batch check conflicts
    const batchResults = await this.calendarService.findBatchConflicts(
      slotsToCheck,
      selectedCalendars,
      task.userId || "",
      task.id
    );

    // Process results and check for conflicts with in-memory scheduled tasks
    for (let i = 0; i < batchResults.length; i++) {
      const result = batchResults[i];
      const original = slotsToCheck[i]?.originalSlot;

      // Add null check to prevent "Cannot read properties of undefined (reading 'slot')"
      if (!result || !result.slot || !original) {
        continue;
      }

      if (result.conflicts.length === 0) {
        // Check for conflicts with in-memory scheduled tasks (also uses buffer expansion)
        if (!this.hasInMemoryConflict(original)) {
          availableSlots.push(original);
        }
      } else {
        original.conflicts = result.conflicts;
      }
    }

    return availableSlots;
  }

  // TODO: Buffer time implementation needs improvement:
  // 1. Currently only checks if buffers fit within work hours but doesn't prevent scheduling in buffer times
  // 2. Should check for conflicts during buffer periods
  // 3. Consider adjusting slot times to include the buffers
  // 4. Could factor buffer availability into slot scoring
  private applyBufferTimes(slots: TimeSlot[]): TimeSlot[] {
    return slots.map((slot) => {
      const { beforeBuffer, afterBuffer } = this.calculateBufferTimes(slot);
      // Only mark as having buffer time if both buffers are within work hours
      slot.hasBufferTime =
        beforeBuffer.isWithinWorkHours && afterBuffer.isWithinWorkHours;
      return slot;
    });
  }

  private scoreSlot(slot: TimeSlot): number {
    const score = this.calculateBaseScore(slot);
    return score;
  }

  private calculateBaseScore(slot: TimeSlot): number {
    // Prefer earlier slots
    const now = newDate();
    const hoursSinceNow = differenceInHours(slot.start, now);
    return -hoursSinceNow; // Higher score for earlier slots
  }

  private scoreSlots(slots: TimeSlot[], task: Task): TimeSlot[] {
    return slots.map((slot) => {
      const score = this.slotScorer.scoreSlot(slot, task);
      return {
        ...slot,
        score: score.total,
      };
    });
  }

  private sortByScore(slots: TimeSlot[]): TimeSlot[] {
    return [...slots].sort((a, b) => b.score - a.score);
  }

  async addScheduledTaskConflict(task: Task): Promise<void> {
    if (task.scheduledStart && task.scheduledEnd) {
      // Add this task to the list of scheduled tasks
      // This will make it show up as a conflict for future slot checks
      const projectId = task.projectId || "none";
      const projectTasks =
        this.slotScorer.getScheduledTasks().get(projectId) || [];
      projectTasks.push({
        start: task.scheduledStart,
        end: task.scheduledEnd,
      });
      this.slotScorer.getScheduledTasks().set(projectId, projectTasks);
    }
  }
}
