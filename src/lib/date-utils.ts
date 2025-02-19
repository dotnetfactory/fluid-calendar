// Date formatting and conversion utilities
import {
  addMinutes,
  isWithinInterval,
  setHours,
  setMinutes,
  getDay,
  differenceInHours,
  differenceInMinutes,
  format,
  isToday,
  isTomorrow,
  isThisWeek,
  isThisYear,
  addDays,
  subDays,
  isSameDay,
  areIntervalsOverlapping,
} from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

/**
 * Converts a datetime string and timezone to UTC Date
 */
export function convertToUTC(dateTimeString: string, timeZone: string): Date {
  // Create a date in the original timezone
  const originalDate = new Date(dateTimeString);

  // Get the UTC timestamp while respecting the original timezone
  const utcDate = new Date(
    originalDate.toLocaleString("en-US", {
      timeZone: timeZone,
    })
  );

  // Adjust for timezone offset
  const offset = originalDate.getTime() - utcDate.getTime();
  return new Date(originalDate.getTime() + offset);
}

/**
 * Formats a date in local timezone for Outlook API
 */
export function formatDateToLocal(date: Date): string {
  return date
    .toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(/(\d+)\/(\d+)\/(\d+), /, "$3-$1-$2T");
}

/**
 * Formats a date to ISO string while preserving local time
 */
export function formatToLocalISOString(date: Date): string {
  const tzOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

// Re-export date-fns functions
export {
  addMinutes,
  isWithinInterval,
  setHours,
  setMinutes,
  getDay,
  differenceInHours,
  differenceInMinutes,
  format,
  isToday,
  isTomorrow,
  isThisWeek,
  isThisYear,
  addDays,
  subDays,
  isSameDay,
  formatInTimeZone,
  toZonedTime,
  areIntervalsOverlapping,
};
