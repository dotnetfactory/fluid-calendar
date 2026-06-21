import { AutoScheduleSettings, TimeFormat } from "@/types/settings";

export function parseWorkDays(workDays: string): number[] {
  try {
    return JSON.parse(workDays);
  } catch {
    return [];
  }
}

export function parseSelectedCalendars(calendars: string): string[] {
  try {
    return JSON.parse(calendars);
  } catch {
    return [];
  }
}

export function stringifyWorkDays(workDays: number[]): string {
  return JSON.stringify(workDays);
}

export function stringifySelectedCalendars(calendars: string[]): string {
  return JSON.stringify(calendars);
}

/**
 * Format a whole-hour value (0-23) for the Auto-Schedule time dropdowns,
 * honoring the user's 12h/24h preference from General settings (issue #129).
 * Defaults to 24-hour so callers without a preference keep the prior output.
 */
export function formatTime(
  hour: number,
  timeFormat: TimeFormat = "24h"
): string {
  if (timeFormat === "12h") {
    const period = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${h12}:00 ${period}`;
  }

  return `${hour.toString().padStart(2, "0")}:00`;
}

export function getEnergyLevelForTime(
  hour: number,
  settings: AutoScheduleSettings
): "high" | "medium" | "low" | null {
  if (
    settings.highEnergyStart !== null &&
    settings.highEnergyEnd !== null &&
    hour >= settings.highEnergyStart &&
    hour < settings.highEnergyEnd
  ) {
    return "high";
  }

  if (
    settings.mediumEnergyStart !== null &&
    settings.mediumEnergyEnd !== null &&
    hour >= settings.mediumEnergyStart &&
    hour < settings.mediumEnergyEnd
  ) {
    return "medium";
  }

  if (
    settings.lowEnergyStart !== null &&
    settings.lowEnergyEnd !== null &&
    hour >= settings.lowEnergyStart &&
    hour < settings.lowEnergyEnd
  ) {
    return "low";
  }

  return null;
}

export function isWorkingHour(
  date: Date,
  settings: AutoScheduleSettings
): boolean {
  const hour = date.getHours();
  const day = date.getDay();
  const workDays = parseWorkDays(settings.workDays);

  return (
    workDays.includes(day) &&
    hour >= settings.workHourStart &&
    hour < settings.workHourEnd
  );
}
