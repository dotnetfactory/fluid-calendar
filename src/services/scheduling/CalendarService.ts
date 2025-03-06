import { CalendarEvent } from "@prisma/client";
import { TimeSlot, Conflict } from "@/types/scheduling";

export interface BatchConflictCheck {
  slot: TimeSlot;
  taskId: string;
  conflicts: Conflict[];
}
export interface CalendarService {
  findConflicts(
    slot: TimeSlot,
    selectedCalendarIds: string[],
    userId: string,
    excludeTaskId?: string
  ): Promise<Conflict[]>;

  getEvents(
    start: Date,
    end: Date,
    selectedCalendarIds: string[],
    userId: string
  ): Promise<CalendarEvent[]>;

  findBatchConflicts(
    slots: { slot: TimeSlot; taskId: string }[],
    selectedCalendarIds: string[],
    userId: string,
    excludeTaskId?: string
  ): Promise<BatchConflictCheck[]>;
}
