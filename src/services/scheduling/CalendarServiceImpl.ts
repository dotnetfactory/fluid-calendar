import { CalendarEvent, PrismaClient } from "@prisma/client";
import { TimeSlot, Conflict } from "@/types/scheduling";
import { CalendarService } from "./CalendarService";
import { areIntervalsOverlapping } from "date-fns";
import { logger } from "@/lib/logger";

export class CalendarServiceImpl implements CalendarService {
  constructor(private prisma: PrismaClient) {}

  async findConflicts(
    slot: TimeSlot,
    selectedCalendarIds: string[],
    excludeTaskId?: string
  ): Promise<Conflict[]> {
    // logger.log("[DEBUG] Checking conflicts for slot:", {
    //   start: slot.start,
    //   end: slot.end,
    //   selectedCalendars: selectedCalendarIds,
    // });

    const conflicts: Conflict[] = [];

    // Check calendar events
    const events = await this.getEvents(
      slot.start,
      slot.end,
      selectedCalendarIds
    );

    // logger.log(`[DEBUG] Found ${events.length} calendar events in range`);
    // if (events.length > 0) {
    //   logger.log("[DEBUG] Calendar events:", {
    //     events: events.map((e) => ({
    //       id: e.id,
    //       title: e.title,
    //       start: e.start,
    //       end: e.end,
    //       feedId: e.feedId,
    //     })),
    //   });
    // }

    for (const event of events) {
      if (
        areIntervalsOverlapping(
          { start: slot.start, end: slot.end },
          { start: event.start, end: event.end }
        )
      ) {
        // logger.log("[DEBUG] Found calendar conflict with event:", {
        //   id: event.id,
        //   title: event.title,
        //   start: event.start,
        //   end: event.end,
        // });

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

    // logger.log(
    //   `[DEBUG] Found ${scheduledTasks.length} scheduled tasks to check`
    // );
    // if (scheduledTasks.length > 0) {
    //   logger.log("[DEBUG] Scheduled tasks:", {
    //     tasks: scheduledTasks.map((t) => ({
    //       id: t.id,
    //       title: t.title,
    //       start: t.scheduledStart,
    //       end: t.scheduledEnd,
    //     })),
    //   });
    // }

    for (const task of scheduledTasks) {
      if (
        task.scheduledStart &&
        task.scheduledEnd &&
        areIntervalsOverlapping(
          { start: slot.start, end: slot.end },
          { start: task.scheduledStart, end: task.scheduledEnd }
        )
      ) {
        // logger.log("[DEBUG] Found task conflict with:", {
        //   id: task.id,
        //   title: task.title,
        //   start: task.scheduledStart,
        //   end: task.scheduledEnd,
        // });

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
      logger.log("[DEBUG] No calendars selected, skipping event check");
      return [];
    }

    // logger.log("[DEBUG] Fetching events for calendars:", {
    //   calendarIds: selectedCalendarIds,
    // });
    return this.prisma.calendarEvent.findMany({
      where: {
        feedId: {
          in: selectedCalendarIds,
        },
        AND: [
          {
            start: {
              lte: end,
            },
          },
          {
            end: {
              gte: start,
            },
          },
        ],
      },
    });
  }
}
