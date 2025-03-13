import { AutoScheduleSettings } from "@prisma/client";
import { TimeSlot, Conflict } from "@/types/scheduling";
import { parseWorkDays, parseSelectedCalendars } from "@/lib/autoSchedule";
import {
  addMinutes,
  setHours,
  setMinutes,
  getDay,
  differenceInHours,
  toZonedTime,
  addDays,
  newDate,
  roundDateUp,
  areIntervalsOverlapping,
} from "@/lib/date-utils";
import { CalendarService } from "./CalendarService";
import { SlotScorer } from "./SlotScorer";
import { Task, PrismaClient } from "@prisma/client";
import { useSettingsStore } from "@/store/settings";

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

  constructor(
    private settings: AutoScheduleSettings,
    private calendarService: CalendarService,
    private prisma: PrismaClient
  ) {
    this.slotScorer = new SlotScorer(settings);
    this.timeZone = useSettingsStore.getState().user.timeZone;
  }

  async updateScheduledTasks(userId: string): Promise<void> {
    // Fetch all scheduled tasks
    const scheduledTasks = await this.prisma.task.findMany({
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

    // 1. Generate potential slots
    const potentialSlots = this.generatePotentialSlots(
      task.duration || DEFAULT_TASK_DURATION,
      startDate,
      endDate
    );

    // 2. Filter by work hours
    const workHourSlots = this.filterByWorkHours(potentialSlots);

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
    const bufferMinutes = this.settings.bufferMinutes;

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
  private generatePotentialSlots(
    duration: number,
    startDate: Date,
    endDate: Date
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const MINIMUM_BUFFER_MINUTES = 15;

    // Convert start and end dates to local time zone
    const localStartDate = toZonedTime(startDate, this.timeZone);
    let localEndDate = toZonedTime(endDate, this.timeZone);
    const localNow = toZonedTime(newDate(), this.timeZone);

    // For the first day, start at the later of:
    // 1. Current time + buffer
    // 2. Work hours start
    let localCurrentStart = localStartDate;

    // If it's today, handle current time
    if (localStartDate.toDateString() === localNow.toDateString()) {
      //question: should we check buffer using the start or the end?
      // Add minimum buffer to current time
      localCurrentStart = addMinutes(localCurrentStart, MINIMUM_BUFFER_MINUTES);

      // If this pushes us past work hours, move to next day at work start
      if (localCurrentStart.getHours() >= this.settings.workHourEnd) {
        localCurrentStart = addDays(
          setMinutes(
            setHours(localCurrentStart, this.settings.workHourStart),
            0
          ),
          1
        );
      }
    } else {
      // For future days, start exactly at work hours start time
      localCurrentStart = setMinutes(
        setHours(localCurrentStart, this.settings.workHourStart),
        0
      );
    }

    localCurrentStart = roundDateUp(localCurrentStart);
    localEndDate = roundDateUp(localEndDate);
    // Generate slots advancing by task duration
    while (localCurrentStart < localEndDate) {
      const slotEnd = addMinutes(localCurrentStart, duration);
      const slot: TimeSlot = {
        start: newDate(localCurrentStart),
        end: newDate(slotEnd),
        score: 0,
        conflicts: [],
        energyLevel: null,
        isWithinWorkHours: false,
        hasBufferTime: false,
      };

      slots.push(slot);
      localCurrentStart = addMinutes(localCurrentStart, duration);
    }

    return slots;
  }

  private filterByWorkHours(slots: TimeSlot[]): TimeSlot[] {
    const filteredSlots = slots.filter((slot) => {
      // Convert UTC to local time for comparison
      const localStart = toZonedTime(slot.start, this.timeZone);
      const localEnd = toZonedTime(slot.end, this.timeZone);

      const startHour = localStart.getHours();
      const endHour = localEnd.getHours();
      const dayOfWeek = localStart.getDay();

      const workDays = parseWorkDays(this.settings.workDays);
      const isWorkDay = workDays.includes(dayOfWeek);
      const isWithinWorkHours =
        startHour >= this.settings.workHourStart &&
        endHour <= this.settings.workHourEnd &&
        startHour < this.settings.workHourEnd; // Ensure start is before work hours end
      const result = isWorkDay && isWithinWorkHours;
      if (result) {
        slot.isWithinWorkHours = true;
      }
      return result;
    });

    return filteredSlots;
  }

  private isWithinWorkHours(slot: TimeSlot): boolean {
    const localStart = toZonedTime(slot.start, this.timeZone);
    const localEnd = toZonedTime(slot.end, this.timeZone);

    const workDays = parseWorkDays(this.settings.workDays);
    const slotDay = getDay(localStart);

    if (!workDays.includes(slotDay)) {
      return false;
    }

    const startHour = localStart.getHours();
    const endHour = localEnd.getHours();

    return (
      startHour >= this.settings.workHourStart &&
      endHour <= this.settings.workHourEnd &&
      startHour < this.settings.workHourEnd
    );
  }

  private async findCalendarConflicts(
    slot: TimeSlot,
    userId: string
  ): Promise<Conflict[]> {
    const selectedCalendars = parseSelectedCalendars(
      this.settings.selectedCalendars
    );
    // Only check for conflicts if calendars are selected
    if (selectedCalendars.length === 0) {
      return [];
    }

    return this.calendarService.findConflicts(slot, selectedCalendars, userId);
  }

  private hasInMemoryConflict(slot: TimeSlot): boolean {
    // Check all project tasks for conflicts
    for (const [, projectTasks] of this.slotScorer
      .getScheduledTasks()
      .entries()) {
      for (const projectTask of projectTasks) {
        if (
          areIntervalsOverlapping(
            { start: slot.start, end: slot.end },
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
      this.settings.selectedCalendars
    );

    // Prepare slots for batch checking
    const slotsToCheck = slots.map((slot) => ({
      slot,
      taskId: task.id,
    }));

    // Batch check conflicts
    const batchResults = await this.calendarService.findBatchConflicts(
      slotsToCheck,
      selectedCalendars,
      task.id
    );

    // Process results and check for conflicts with in-memory scheduled tasks
    for (const result of batchResults) {
      if (result.conflicts.length === 0) {
        // Check for conflicts with in-memory scheduled tasks
        if (!this.hasInMemoryConflict(result.slot)) {
          availableSlots.push(result.slot);
        }
      } else {
        result.slot.conflicts = result.conflicts;
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
