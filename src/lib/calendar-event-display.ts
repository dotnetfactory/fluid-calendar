import { TimeFormat } from "@/types/settings";

/**
 * Day-grid views (month, multi-month) render events as compact chips inside a
 * day cell. Time-grid views (day, week) already lay events out on a time axis
 * and color the event block, so the month-style "time + colored dot" treatment
 * only applies to day-grid views.
 */
export function isDayGridView(viewType: string): boolean {
  return viewType.startsWith("dayGrid") || viewType.startsWith("multiMonth");
}

/**
 * Format an event's start time for compact display in a month cell, honoring
 * the user's 12h/24h preference. Implemented locally (rather than via date-fns
 * locale formatting) so the output is deterministic regardless of locale.
 */
export function formatEventTime(date: Date, timeFormat: TimeFormat): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const mm = minutes.toString().padStart(2, "0");

  if (timeFormat === "24h") {
    return `${hours.toString().padStart(2, "0")}:${mm}`;
  }

  const period = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${mm} ${period}`;
}

export interface MonthEventDisplay {
  /**
   * Whether this is a timed (non-all-day, non-task) event rendered in a
   * day-grid view, for any segment. Day-grid views color every segment of an
   * event, so this drives the accessible calendar-name label that keeps that
   * color cue from being the only way to identify the calendar.
   */
  isDayGridTimed: boolean;
  /**
   * Whether to render the month-style timed chip: a calendar-colored dot
   * followed by the event's start time. True only on the starting segment, so
   * multi-day continuation segments don't repeat the start time.
   */
  showTimeChip: boolean;
  /** The formatted start time, or "" when there is no time chip to show. */
  timeText: string;
}

/**
 * Decide how a timed event should be presented in a day-grid (month) cell.
 *
 * Issue #95: timed events in month view previously showed only a generic clock
 * icon, with no time and no calendar color, making them hard to scan next to
 * the colored all-day events. Timed, non-task events in day-grid views now get
 * a calendar-colored dot plus their start time. All-day events, tasks, and
 * time-grid views keep their existing treatment.
 *
 * `isStart` is FullCalendar's per-segment flag: a multi-day event is rendered
 * as one segment per day, and only the first segment carries the real start
 * time. Later segments must not repeat it, so the chip is shown only on the
 * starting segment.
 */
export function getMonthEventDisplay(params: {
  viewType: string;
  allDay: boolean;
  isTask: boolean;
  start: Date | null;
  isStart: boolean;
  timeFormat: TimeFormat;
}): MonthEventDisplay {
  const { viewType, allDay, isTask, start, isStart, timeFormat } = params;

  const isDayGridTimed =
    isDayGridView(viewType) && !allDay && !isTask && start !== null;
  // The colored dot and time only belong on the starting segment; the calendar
  // identity (isDayGridTimed) applies to every colored segment.
  const showTimeChip = isDayGridTimed && isStart;

  return {
    isDayGridTimed,
    showTimeChip,
    timeText: showTimeChip && start ? formatEventTime(start, timeFormat) : "",
  };
}
