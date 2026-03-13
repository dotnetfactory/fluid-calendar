import { AutoScheduleSettings } from "@/types/settings";

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

export function formatTime(hour: number): string {
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
