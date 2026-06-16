import { CalendarEvent, CalendarFeed } from "@/types/calendar";
import { UpdateTask } from "@/types/task";

// Extra fields getTasksAsEvents puts on extendedProps beyond ExtendedEventProps
interface TaskDragProps {
  isTask?: boolean;
  taskId?: string;
  isAutoScheduled?: boolean;
}

const WRITABLE_FEED_TYPES = new Set(["GOOGLE", "OUTLOOK", "CALDAV"]);

export interface DragChange {
  item: CalendarEvent;
  newStart: Date;
  newEnd: Date | null;
  oldStart: Date | null;
  oldEnd: Date | null;
  oldAllDay: boolean;
  newAllDay: boolean;
  isResize: boolean;
}

export type DropUpdate =
  | { kind: "task"; taskId: string; updates: UpdateTask }
  | {
      kind: "event";
      eventId: string;
      updates: { start: Date; end: Date; allDay: boolean };
    }
  | { kind: "blocked"; reason: string };

export function getEventEditability(
  item: CalendarEvent,
  feeds: CalendarFeed[]
): { startEditable: boolean; durationEditable: boolean } {
  const props = item.extendedProps as TaskDragProps | undefined;

  if (props?.isTask) {
    // Non-auto-scheduled tasks render as all-day due-date chips; moving one
    // would mean changing its due date, which drag doesn't support yet
    const editable =
      Boolean(props.isAutoScheduled) && Boolean(props.taskId) && !item.allDay;
    return { startEditable: editable, durationEditable: editable };
  }

  if (item.allDay) {
    // All-day events use date (not dateTime) in external APIs; dragging them
    // risks converting them to timed events
    return { startEditable: false, durationEditable: false };
  }

  const feed = feeds.find((f) => f.id === item.feedId);
  const editable = Boolean(feed && WRITABLE_FEED_TYPES.has(feed.type));
  return { startEditable: editable, durationEditable: editable };
}

export function computeDropUpdate(
  change: DragChange,
  feeds: CalendarFeed[]
): DropUpdate {
  const { item, newStart, oldStart, oldEnd, oldAllDay, newAllDay, isResize } =
    change;

  if (oldAllDay !== newAllDay) {
    return {
      kind: "blocked",
      reason:
        "Switching between all-day and timed isn't supported — edit the item instead",
    };
  }

  // FullCalendar reports end as null for zero-duration events; preserve the
  // previous duration in that case
  const oldDurationMs =
    oldStart && oldEnd ? oldEnd.getTime() - oldStart.getTime() : 0;
  const newEnd =
    change.newEnd ?? new Date(newStart.getTime() + oldDurationMs);

  const props = item.extendedProps as TaskDragProps | undefined;
  if (props?.isTask) {
    if (!props.taskId || !props.isAutoScheduled) {
      return {
        kind: "blocked",
        reason: "Only auto-scheduled tasks can be moved on the calendar",
      };
    }
    const updates: UpdateTask = {
      scheduledStart: newStart,
      scheduledEnd: newEnd,
      // A manual move pins the task; otherwise the next auto-schedule run
      // (triggered by this very update) would immediately move it back
      scheduleLocked: true,
      isAutoScheduled: true,
    };
    if (isResize) {
      updates.duration = Math.round(
        (newEnd.getTime() - newStart.getTime()) / 60000
      );
    }
    return { kind: "task", taskId: props.taskId, updates };
  }

  const feed = feeds.find((f) => f.id === item.feedId);
  if (!feed || !WRITABLE_FEED_TYPES.has(feed.type)) {
    return { kind: "blocked", reason: "This calendar is read-only" };
  }

  return {
    kind: "event",
    eventId: item.id,
    updates: { start: newStart, end: newEnd, allDay: item.allDay },
  };
}
