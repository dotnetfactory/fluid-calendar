// Date formatting and conversion utilities
import {
  addDays,
  addMinutes,
  areIntervalsOverlapping,
  differenceInHours,
  differenceInMinutes,
  endOfDay as fnEndOfDay,
  parseISO as fnParseISO,
  startOfDay as fnStartOfDay,
  format,
  getDay,
  isBefore,
  isSameDay,
  isThisWeek,
  isThisYear,
  isToday,
  isTomorrow,
  isWithinInterval,
  setHours,
  setMinutes,
  subDays,
  subMinutes,
} from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

export function newDate(date?: Date | string | number): Date {
  if (date === undefined) {
    return new Date();
  }
  return new Date(date);
}
export function newDateFromYMD(year: number, month: number, day: number): Date {
  return new Date(year, month, day);
}
export function formatDate(date: Date): string {
  // Ensure we have a valid date object
  const validDate =
    date instanceof Date && !isNaN(date.getTime()) ? date : newDate();

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(validDate);
}

export function roundDateUp(date: Date, minutes?: number | undefined): Date {
  if (minutes === undefined) {
    minutes = 30;
  }
  const roundedDate = new Date(date);
  roundedDate.setMinutes(
    Math.ceil(roundedDate.getMinutes() / minutes) * minutes
  );
  return roundedDate;
}

export function getWeekDays(short = false): string[] {
  const weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return short ? weekdays.map((day) => day.slice(0, 3)) : weekdays;
}

export function getDaysInMonth(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = newDateFromYMD(year, month + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, i) =>
    newDateFromYMD(year, month, i + 1)
  );
}

/**
 * Converts a datetime string and timezone to UTC Date
 */
export function convertToUTC(dateTimeString: string, timeZone: string): Date {
  // Create a date in the original timezone
  const originalDate = newDate(dateTimeString);

  // Get the UTC timestamp while respecting the original timezone
  const utcDate = newDate(
    originalDate.toLocaleString("en-US", {
      timeZone: timeZone,
    })
  );

  // Adjust for timezone offset
  const offset = originalDate.getTime() - utcDate.getTime();
  return newDate(originalDate.getTime() + offset);
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
  return newDate(date.getTime() - tzOffset)
    .toISOString()
    .slice(0, 16);
}

export function addHours(date: Date, hours: number): Date {
  return addMinutes(date, hours * 60);
}

/**
 * Get the start of day for a date
 */
export function startOfDay(date: Date): Date {
  return fnStartOfDay(date);
}

/**
 * Get the end of day for a date
 */
export function endOfDay(date: Date): Date {
  return fnEndOfDay(date);
}

/**
 * Parse an ISO date string to a Date object
 */
export function parseISO(dateString: string): Date {
  return fnParseISO(dateString);
}

/**
 * Subtract hours from a date
 */
export function subHours(date: Date, hours: number): Date {
  return subMinutes(date, hours * 60);
}

/**
 * Creates a date at UTC midnight from a local date's components
 * This is useful for storing dates consistently regardless of user timezone
 */
export function createUTCMidnightDate(localDate: Date | null): Date | null {
  if (!localDate) return null;
  return new Date(
    Date.UTC(localDate.getFullYear(), localDate.getMonth(), localDate.getDate())
  );
}

/**
 * Creates a date for an all-day event, handling timezone issues
 * For all-day events, the date should be interpreted as local midnight
 * This prevents issues where all-day events appear on the wrong day due to timezone conversion
 * @param dateString The date string in ISO format (YYYY-MM-DD)
 * @returns Date object representing midnight (00:00:00) in local time for that day
 */
export function createAllDayDate(dateString: string): Date {
  if (!dateString) return new Date();

  // For an all-day event, extract just the YYYY-MM-DD portion
  const [year, month, day] = dateString.split("T")[0].split("-").map(Number);

  // Create a date at midnight local time for the specified day
  // Use setHours(0,0,0,0) to ensure consistent midnight timing
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Normalizes a date for all-day event display
 * Ensures the date is set to local midnight and strips any time component
 * This helps prevent timezone-related display issues with all-day events
 * @param date The date to normalize
 * @returns Date object normalized to local midnight
 */
export function normalizeAllDayDate(date: Date): Date {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);
  return normalizedDate;
}

/**
 * Creates a date for an Outlook all-day event
 * Outlook requires all-day events to have start and end times at exactly midnight UTC
 * @param dateString The date string in ISO format (YYYY-MM-DD)
 * @returns Date object representing midnight (00:00:00) in UTC for that day
 */
export function createOutlookAllDayDate(dateString: string): Date {
  if (!dateString) return new Date();

  // For an all-day event, extract just the YYYY-MM-DD portion
  const [year, month, day] = dateString.split("T")[0].split("-").map(Number);

  // Create a date at midnight UTC for the specified day
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
}

/**
 * Checks if a date is in the future (tomorrow or later)
 * @param date The date to check
 * @returns boolean indicating if the date is tomorrow or later
 */
export function isFutureDate(date: Date | string | number | null): boolean {
  if (!date) return false;
  const targetDate = startOfDay(newDate(date));
  const tomorrow = startOfDay(addDays(newDate(), 1));
  return targetDate >= tomorrow;
}

/**
 * Converts a UTC date to a zoned time in the user's timezone
 * This is particularly useful for email templates and API responses
 * @param date The date to convert
 * @param timezone The user's timezone
 * @returns The date converted to the user's timezone
 */
export function convertToUserTimezone(date: Date, timezone: string): Date {
  // First ensure we're working with a proper Date object
  const dateObj = date instanceof Date ? date : new Date(date);

  // Convert to the user's timezone
  return toZonedTime(dateObj, timezone || "UTC");
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
  isBefore,
};
