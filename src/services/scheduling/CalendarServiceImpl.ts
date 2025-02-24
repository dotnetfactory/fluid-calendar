import { CalendarEvent, PrismaClient } from "@prisma/client";
import { TimeSlot, Conflict } from "@/types/scheduling";
import { BatchConflictCheck, CalendarService } from "./CalendarService";
import { areIntervalsOverlapping } from "@/lib/date-utils";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "CalendarService";

interface EventCache {
  events: CalendarEvent[];
  startDay: number; // Unix timestamp for start of week
  endDay: number; // Unix timestamp for end of week
  calendarIds: string[];
  timestamp: number;
}

export class CalendarServiceImpl implements CalendarService {
  private cache: EventCache | null = null;
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds

  constructor(private prisma: PrismaClient) {}

  private getDayTimestamp(date: Date): number {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    ).getTime();
  }

  private getWeekTimestamp(date: Date, start: boolean): number {
    const d = new Date(date);
    // Get to Sunday (start) or Saturday (end) of the week
    const day = d.getDay();
    const diff = start ? -day : 6 - day;
    d.setDate(d.getDate() + diff);
    return this.getDayTimestamp(d);
  }

  //TODO: we need to check cache if calendars or events change e.g. sync or crud of events or calendars - DO NOT REMOVE THIS COMMENT
  private isCacheValid(start: Date, end: Date, calendarIds: string[]): boolean {
    if (!this.cache) {
      logger.debug(
        "[DEBUG] Cache miss - no cache exists",
        {
          metadata: { timestamp: new Date().toISOString() },
        },
        LOG_SOURCE
      );
      return false;
    }

    const now = Date.now();
    const cacheAge = now - this.cache.timestamp;
    if (cacheAge > this.CACHE_TTL) {
      logger.debug(
        "[DEBUG] Cache expired",
        {
          metadata: { cacheAge: String(cacheAge) },
        },
        LOG_SOURCE
      );
      return false;
    }

    // Sort and stringify calendar IDs for consistent comparison
    const sortedRequestedIds = [...calendarIds].sort();
    const sortedCachedIds = [...this.cache.calendarIds].sort();
    const sameCalendars =
      JSON.stringify(sortedRequestedIds) === JSON.stringify(sortedCachedIds);

    // Check if the requested range falls within the cached week(s)
    const requestedStartWeek = this.getWeekTimestamp(start, true);
    const requestedEndWeek = this.getWeekTimestamp(end, false);
    const hasDateRange =
      this.cache.startDay <= requestedStartWeek &&
      this.cache.endDay >= requestedEndWeek;

    if (!hasDateRange || !sameCalendars) {
      logger.debug(
        "[DEBUG] Cache invalid",
        {
          metadata: {
            reason: !hasDateRange ? "date range mismatch" : "calendar mismatch",
            sameCalendars,
            requestedStart: new Date(start).toISOString(),
            requestedEnd: new Date(end).toISOString(),
            requestedStartWeek: new Date(requestedStartWeek).toISOString(),
            requestedEndWeek: new Date(requestedEndWeek).toISOString(),
            cacheStart: new Date(this.cache.startDay).toISOString(),
            cacheEnd: new Date(this.cache.endDay).toISOString(),
            requestedIds: sortedRequestedIds,
            cachedIds: sortedCachedIds,
          },
        },
        LOG_SOURCE
      );
    }

    return sameCalendars && hasDateRange;
  }

  async findConflicts(
    slot: TimeSlot,
    selectedCalendarIds: string[],
    excludeTaskId?: string
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    // Check calendar events
    const events = await this.getEvents(
      slot.start,
      slot.end,
      selectedCalendarIds
    );

    for (const event of events) {
      if (
        areIntervalsOverlapping(
          { start: slot.start, end: slot.end },
          { start: event.start, end: event.end }
        )
      ) {
        conflicts.push({
          type: "calendar_event",
          start: event.start,
          end: event.end,
          title: event.title,
          source: {
            type: "calendar",
            id: event.id,
          },
        });
        // Return immediately if we find a calendar conflict
        return conflicts;
      }
    }

    // Only check task conflicts if there are no calendar conflicts
    const scheduledTasks = await this.prisma.task.findMany({
      where: {
        isAutoScheduled: true,
        scheduledStart: { not: null },
        scheduledEnd: { not: null },
        id: excludeTaskId ? { not: excludeTaskId } : undefined,
      },
    });

    for (const task of scheduledTasks) {
      if (
        task.scheduledStart &&
        task.scheduledEnd &&
        areIntervalsOverlapping(
          { start: slot.start, end: slot.end },
          { start: task.scheduledStart, end: task.scheduledEnd }
        )
      ) {
        conflicts.push({
          type: "task",
          start: task.scheduledStart,
          end: task.scheduledEnd,
          title: task.title,
          source: {
            type: "task",
            id: task.id,
          },
        });
      }
    }

    return conflicts;
  }

  async getEvents(
    start: Date,
    end: Date,
    selectedCalendarIds: string[]
  ): Promise<CalendarEvent[]> {
    // Only query if we have selected calendars
    if (selectedCalendarIds.length === 0) {
      logger.debug(
        "[DEBUG] No calendars selected, skipping event check",
        {
          metadata: { timestamp: new Date().toISOString() },
        },
        LOG_SOURCE
      );
      return [];
    }

    // Check if we can use cached events
    if (this.isCacheValid(start, end, selectedCalendarIds)) {
      logger.debug(
        "[DEBUG] Using cached calendar events",
        {
          metadata: { timestamp: new Date().toISOString() },
        },
        LOG_SOURCE
      );
      return this.cache!.events.filter(
        (event) => event.start <= end && event.end >= start
      );
    }

    // If cache miss, fetch events for the entire weeks containing the range
    const startDay = new Date(this.getWeekTimestamp(start, true));
    const endDay = new Date(this.getWeekTimestamp(end, false));
    endDay.setDate(endDay.getDate() + 1); // Add one more day just to be safe

    logger.debug(
      "[DEBUG] Cache miss - Fetching events for calendars:",
      {
        metadata: {
          calendarIds: selectedCalendarIds,
          startDay: startDay.toISOString(),
          endDay: endDay.toISOString(),
          requestedStart: start.toISOString(),
          requestedEnd: end.toISOString(),
        },
      },
      LOG_SOURCE
    );

    const events = await this.prisma.calendarEvent.findMany({
      where: {
        feedId: {
          in: selectedCalendarIds,
        },
        AND: [
          {
            start: {
              lte: endDay,
            },
          },
          {
            end: {
              gte: startDay,
            },
          },
        ],
      },
    });

    // Update cache with new timestamp
    this.cache = {
      events,
      startDay: startDay.getTime(),
      endDay: endDay.getTime(),
      calendarIds: selectedCalendarIds,
      timestamp: Date.now(),
    };

    return events.filter((event) => event.start <= end && event.end >= start);
  }

  /**
   * Checks conflicts for multiple slots in batch against calendar events and scheduled tasks
   * @param slots Array of slots to check
   * @param selectedCalendarIds Calendar IDs to check against
   * @param excludeTaskId Optional task ID to exclude from conflict checking
   * @returns Array of BatchConflictCheck results
   */
  async findBatchConflicts(
    slots: { slot: TimeSlot; taskId: string }[],
    selectedCalendarIds: string[],
    excludeTaskId?: string
  ): Promise<BatchConflictCheck[]> {
    // Get the earliest start and latest end times from all slots
    const startTime = slots.reduce(
      (earliest, { slot }) => (slot.start < earliest ? slot.start : earliest),
      slots[0].slot.start
    );
    const endTime = slots.reduce(
      (latest, { slot }) => (slot.end > latest ? slot.end : latest),
      slots[0].slot.end
    );

    // Fetch all calendar events for the entire time range at once
    const events = await this.getEvents(
      startTime,
      endTime,
      selectedCalendarIds
    );

    // Fetch all scheduled tasks once
    const scheduledTasks = await this.prisma.task.findMany({
      where: {
        isAutoScheduled: true,
        scheduledStart: { not: null },
        scheduledEnd: { not: null },
        id: excludeTaskId ? { not: excludeTaskId } : undefined,
      },
    });

    // Check conflicts for each slot
    return slots.map(({ slot, taskId }) => {
      const conflicts: Conflict[] = [];

      // Check calendar conflicts
      for (const event of events) {
        if (
          areIntervalsOverlapping(
            { start: slot.start, end: slot.end },
            { start: event.start, end: event.end }
          )
        ) {
          conflicts.push({
            type: "calendar_event",
            start: event.start,
            end: event.end,
            title: event.title,
            source: {
              type: "calendar",
              id: event.id,
            },
          });
          break; // Found a calendar conflict, no need to check more events
        }
      }

      // If no calendar conflicts, check task conflicts
      if (conflicts.length === 0) {
        for (const task of scheduledTasks) {
          if (
            task.scheduledStart &&
            task.scheduledEnd &&
            areIntervalsOverlapping(
              { start: slot.start, end: slot.end },
              { start: task.scheduledStart, end: task.scheduledEnd }
            )
          ) {
            conflicts.push({
              type: "task",
              start: task.scheduledStart,
              end: task.scheduledEnd,
              title: task.title,
              source: {
                type: "task",
                id: task.id,
              },
            });
          }
        }
      }

      return { slot, taskId, conflicts };
    });
  }
}
