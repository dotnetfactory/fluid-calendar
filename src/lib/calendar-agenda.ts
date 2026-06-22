import { getEventEditability } from "@/lib/calendar-drag";

import { CalendarEvent, CalendarFeed, ExtendedEventProps } from "@/types/calendar";

// Default colors mirror the other calendar views (see DayView/WeekView): tasks
// fall back to indigo, events to blue.
const DEFAULT_TASK_EVENT_COLOR = "#4f46e5";
const DEFAULT_EVENT_COLOR = "#3b82f6";

// The FullCalendar-event shape the agenda view feeds into `<FullCalendar />`.
// Kept structurally identical to what the Day/Week/Month views build inline so
// the list renders items consistently with the grid views.
export interface AgendaEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  backgroundColor: string;
  borderColor: string;
  allDay: boolean;
  classNames: string[];
  startEditable: boolean;
  durationEditable: boolean;
  extendedProps: ExtendedEventProps & {
    isRecurring?: boolean;
  };
}

/**
 * Format the merged calendar items (events + tasks-as-events from
 * `getAllCalendarItems`) into the FullCalendar event shape the Agenda view
 * renders, applying the same enabled-feed filtering the other views use and
 * sorting the result chronologically.
 *
 * Tasks (feedId === "tasks") are always included; events are included only when
 * their feed exists and is enabled. The logic mirrors the inline mapping in
 * `DayView`/`WeekView` so the agenda is consistent with the grid views, but is
 * pulled out as a pure function so it can be unit-tested without rendering
 * FullCalendar.
 */
export function formatAgendaItems(
  items: CalendarEvent[],
  feeds: CalendarFeed[]
): AgendaEvent[] {
  return items
    .filter((item) => {
      if (item.feedId === "tasks") return true;
      const feed = feeds.find((f) => f.id === item.feedId);
      return Boolean(feed?.enabled);
    })
    .map((item) => {
      const isTask = item.feedId === "tasks";
      const color = isTask
        ? item.color || DEFAULT_TASK_EVENT_COLOR
        : feeds.find((f) => f.id === item.feedId)?.color || DEFAULT_EVENT_COLOR;

      return {
        id: item.id,
        title: item.title,
        start: item.start,
        end: item.end,
        location: item.location,
        backgroundColor: color,
        borderColor: color,
        allDay: item.allDay,
        classNames: [
          item.extendedProps?.isTask ? "calendar-task" : "calendar-event",
        ],
        ...getEventEditability(item, feeds),
        extendedProps: {
          ...item.extendedProps,
          isTask: item.extendedProps?.isTask,
          isRecurring: item.isRecurring,
          status: item.extendedProps?.status,
          priority: item.extendedProps?.priority,
        },
      };
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}
