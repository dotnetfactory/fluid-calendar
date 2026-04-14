export interface ScheduleTimeBlock {
  id: string;
  dayOfWeek: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export interface Schedule {
  id: string;
  name: string;
  timezone: string;
  isSystem: boolean;
  color: string | null;
  selectedCalendars: string;
  bufferMinutes: number;
  highEnergyStart: number | null;
  highEnergyEnd: number | null;
  mediumEnergyStart: number | null;
  mediumEnergyEnd: number | null;
  lowEnergyStart: number | null;
  lowEnergyEnd: number | null;
  timeBlocks: ScheduleTimeBlock[];
  createdAt: string;
  updatedAt: string;
}

export interface NewScheduleTimeBlock {
  dayOfWeek: number;
  startHour: number;
  startMinute?: number;
  endHour: number;
  endMinute?: number;
}

export interface NewSchedule {
  name: string;
  timezone?: string;
  color?: string;
  selectedCalendars?: string;
  bufferMinutes?: number;
  timeBlocks?: NewScheduleTimeBlock[];
}

export type UpdateSchedule = Partial<NewSchedule>;

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
