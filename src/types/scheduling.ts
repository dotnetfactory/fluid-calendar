import { Task } from "@prisma/client";

export type EnergyLevel = "high" | "medium" | "low";

export interface TimeSlot {
  start: Date;
  end: Date;
  score: number;
  conflicts: Conflict[];
  energyLevel: EnergyLevel | null;
  isWithinWorkHours: boolean;
  hasBufferTime: boolean;
}

export interface Conflict {
  type: "calendar_event" | "task" | "buffer" | "outside_work_hours";
  start: Date;
  end: Date;
  title: string;
  source: {
    type: "calendar" | "task";
    id: string;
  };
}

export interface ScheduleResult {
  task: Task;
  slot: TimeSlot;
  score: number;
  alternatives: TimeSlot[];
}

export interface SlotScore {
  total: number;
  factors: {
    workHourAlignment: number;
    energyLevelMatch: number;
    projectProximity: number;
    bufferAdequacy: number;
    timePreference: number;
    deadlineProximity: number;
    priorityScore: number;
  };
}
