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
  roundedDate.setMinutes(Math.ceil(roundedDate.getMinutes() / minutes) * minutes);
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

  return Array.from(
    { length: daysInMonth },
    (_, i) => newDateFromYMD(year, month, i + 1)
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
  return newDate(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

export function addHours(date: Date, hours: number): Date {
  return addMinutes(date, hours * 60);
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
