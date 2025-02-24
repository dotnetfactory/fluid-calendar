import { Task } from "@prisma/client";
import { newDate } from "@/lib/date-utils";

/**
 * Represents the state of a focus mode session
 */
export interface FocusMode {
  isActive: boolean;
  currentTaskId: string | null;
  queuedTaskIds: string[];
  sessionStartTime: Date | null;
  sessionStats: FocusSessionStats;
}

/**
 * Statistics for a focus mode session
 */
export interface FocusSessionStats {
  tasksCompleted: number;
  timeSpent: number; // in minutes
  sessionStart: Date;
  sessionEnd: Date | null;
}

/**
 * Task with additional focus-related properties
 */
export interface FocusTask extends Task {
  focusScore?: number; // Score for task priority in focus mode
  lastFocusedAt?: Date | null; // Last time this task was focused on
  focusTimeSpent?: number; // Total time spent focusing on this task (in minutes)
}

/**
 * Default values for a new focus mode session
 */
export const DEFAULT_FOCUS_MODE: FocusMode = {
  isActive: false,
  currentTaskId: null,
  queuedTaskIds: [],
  sessionStartTime: null,
  sessionStats: {
    tasksCompleted: 0,
    timeSpent: 0,
    sessionStart: newDate(),
    sessionEnd: null,
  },
};

/**
 * Focus mode session status
 */
export enum FocusStatus {
  INACTIVE = "inactive",
  ACTIVE = "active",
  PAUSED = "paused",
  COMPLETED = "completed",
}
