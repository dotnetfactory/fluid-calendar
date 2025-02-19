import { AutoScheduleSettings } from "@prisma/client";
import { TimeSlot, Conflict } from "@/types/scheduling";
import { parseWorkDays, parseSelectedCalendars } from "@/lib/autoSchedule";
import {
  addMinutes,
  isWithinInterval,
  setHours,
  setMinutes,
  getDay,
  differenceInHours,
  formatInTimeZone,
  toZonedTime,
} from "@/lib/date-utils";
import { CalendarService } from "./CalendarService";
import { SlotScorer } from "./SlotScorer";
import { Task, PrismaClient } from "@prisma/client";
import { useSettingsStore } from "@/store/settings";
import { logger } from "@/lib/logger";

export interface TimeSlotManager {
  findAvailableSlots(
    task: Task,
    startDate: Date,
    endDate: Date
  ): Promise<TimeSlot[]>;

  isSlotAvailable(slot: TimeSlot): Promise<boolean>;

  calculateBufferTimes(slot: TimeSlot): {
    beforeBuffer: TimeSlot;
    afterBuffer: TimeSlot;
  };

  updateScheduledTasks(): Promise<void>;
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
    logger.log("[DEBUG] TimeSlotManager constructor");
  }

  async updateScheduledTasks(): Promise<void> {
    // Fetch all scheduled tasks
    const scheduledTasks = await this.prisma.task.findMany({
      where: {
        isAutoScheduled: true,
        scheduledStart: { not: null },
        scheduledEnd: { not: null },
        projectId: { not: null },
      },
    });

    // Update the slot scorer with the latest scheduled tasks
    this.slotScorer.updateScheduledTasks(scheduledTasks);
  }

  async findAvailableSlots(
    task: Task,
    startDate: Date,
    endDate: Date
  ): Promise<TimeSlot[]> {
    // logger.log("[DEBUG] Finding available slots for task:", {
    //   taskId: task.id,
    //   title: task.title,
    //   duration: task.duration,
    //   window: { start: startDate, end: endDate },
    //   workHours: {
    //     start: this.settings.workHourStart,
    //     end: this.settings.workHourEnd,
    //   },
    //   workDays: this.settings.workDays,
    //   selectedCalendars: this.settings.selectedCalendars,
    // });

    // Ensure we have the latest scheduled tasks
    await this.updateScheduledTasks();

    // 1. Generate potential slots
    const potentialSlots = this.generatePotentialSlots(
      task.duration || 60,
      startDate,
      endDate
    );

    // logger.log(`[DEBUG] Generated ${potentialSlots.length} potential slots`);

    // 2. Filter by work hours
    const workHourSlots = this.filterByWorkHours(potentialSlots);

    // logger.log(
    //   `[DEBUG] ${workHourSlots.length} slots remain after work hours filter`
    // );

    // 3. Check calendar conflicts
    const availableSlots = await this.removeConflicts(workHourSlots, task);

    // logger.log(`[DEBUG] Found ${availableSlots.length} available slots`);
    // if (availableSlots.length > 0) {
    //   logger.log("[DEBUG] Available slots:", {
    //     slots: availableSlots.map((slot) => ({
    //       start: slot.start,
    //       end: slot.end,
    //       score: this.scoreSlot(slot),
    //     })),
    //   });
    // }

    // 4. Apply buffer times
    const slotsWithBuffer = this.applyBufferTimes(availableSlots);

    // 5. Score slots
    const scoredSlots = this.scoreSlots(slotsWithBuffer, task);

    // 6. Sort by score
    return this.sortByScore(scoredSlots);
  }

  async isSlotAvailable(slot: TimeSlot): Promise<boolean> {
    // Check if the slot is within work hours
    if (!this.isWithinWorkHours(slot)) {
      return false;
    }

    // Check for calendar conflicts
    const conflicts = await this.findCalendarConflicts(slot);
    return conflicts.length === 0;
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

  private generatePotentialSlots(
    duration: number,
    startDate: Date,
    endDate: Date
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    let currentStart = startDate;

    // Convert start and end dates to local time zone
    const localStartDate = toZonedTime(startDate, this.timeZone);

    // Set the start time to the beginning of work hours on the start date
    const localCurrentStart = setMinutes(
      setHours(localStartDate, this.settings.workHourStart),
      0
    );

    // Convert back to UTC for storage
    currentStart = new Date(
      formatInTimeZone(
        localCurrentStart,
        this.timeZone,
        "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
      )
    );

    while (currentStart < endDate) {
      const slot: TimeSlot = {
        start: currentStart,
        end: addMinutes(currentStart, duration),
        score: 0,
        conflicts: [],
        energyLevel: null,
        isWithinWorkHours: false,
        hasBufferTime: false,
      };

      slots.push(slot);
      currentStart = addMinutes(currentStart, 30); // 30-minute intervals
    }

    return slots;
  }

  private filterByWorkHours(slots: TimeSlot[]): TimeSlot[] {
    return slots.filter((slot) => {
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

      // if (!isWorkDay || !isWithinWorkHours) {
      //   logger.log("[DEBUG] Filtered out slot:", {
      //     start: slot.start,
      //     end: slot.end,
      //     localStart: localStart,
      //     localEnd: localEnd,
      //     reason: !isWorkDay ? "not work day" : "outside work hours",
      //     dayOfWeek,
      //     startHour,
      //     endHour,
      //     workHourStart: this.settings.workHourStart,
      //     workHourEnd: this.settings.workHourEnd,
      //   });
      // }

      return isWorkDay && isWithinWorkHours;
    });
  }

  private isWithinWorkHours(slot: TimeSlot): boolean {
    const localStart = toZonedTime(slot.start, this.timeZone);
    const localEnd = toZonedTime(slot.end, this.timeZone);

    const workDays = parseWorkDays(this.settings.workDays);
    const slotDay = getDay(localStart);

    if (!workDays.includes(slotDay)) {
      return false;
    }

    const startHour = this.settings.workHourStart;
    const endHour = this.settings.workHourEnd;

    const workDayStart = setMinutes(setHours(localStart, startHour), 0);
    const workDayEnd = setMinutes(setHours(localStart, endHour), 0);

    return (
      isWithinInterval(localStart, { start: workDayStart, end: workDayEnd }) &&
      isWithinInterval(localEnd, { start: workDayStart, end: workDayEnd })
    );
  }

  private async findCalendarConflicts(slot: TimeSlot): Promise<Conflict[]> {
    const selectedCalendars = parseSelectedCalendars(
      this.settings.selectedCalendars
    );
    // Only check for conflicts if calendars are selected
    if (selectedCalendars.length === 0) {
      // logger.log("[DEBUG] No calendars selected for conflict checking");
      return [];
    }

    // logger.log("[DEBUG] Checking conflicts with calendars:", {
    //   calendarIds: selectedCalendars,
    // });
    return this.calendarService.findConflicts(slot, selectedCalendars);
  }

  private async removeConflicts(
    slots: TimeSlot[],
    task: Task
  ): Promise<TimeSlot[]> {
    const availableSlots: TimeSlot[] = [];

    // Get all scheduled tasks
    const scheduledTasks = await this.prisma.task.findMany({
      where: {
        isAutoScheduled: true,
        scheduledStart: { not: null },
        scheduledEnd: { not: null },
        id: { not: task.id }, // Exclude current task
      },
    });

    for (const slot of slots) {
      const conflicts = await this.findCalendarConflicts(slot);

      // Check for conflicts with other scheduled tasks
      const hasTaskConflict = scheduledTasks.some(
        (scheduledTask) =>
          scheduledTask.scheduledStart &&
          scheduledTask.scheduledEnd &&
          ((slot.start >= scheduledTask.scheduledStart &&
            slot.start < scheduledTask.scheduledEnd) ||
            (slot.end > scheduledTask.scheduledStart &&
              slot.end <= scheduledTask.scheduledEnd))
      );

      if (conflicts.length === 0 && !hasTaskConflict) {
        availableSlots.push(slot);
      } else {
        slot.conflicts = [
          ...conflicts,
          ...(hasTaskConflict
            ? [
                {
                  type: "task" as const,
                  start: slot.start,
                  end: slot.end,
                  title: "Conflict with another scheduled task",
                  source: { type: "task" as const, id: "conflict" },
                },
              ]
            : []),
        ];
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
    // logger.log("[DEBUG] Scored slot:", {
    //   start: slot.start,
    //   end: slot.end,
    //   score,
    // });
    return score;
  }

  private calculateBaseScore(slot: TimeSlot): number {
    // Prefer earlier slots
    const now = new Date();
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
}
