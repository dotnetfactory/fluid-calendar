import { Task } from "@prisma/client";

/**
 * Represents the state of a focus mode session
 */
export interface FocusMode {
  currentTaskId: string | null;
  queuedTaskIds: string[];
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
  currentTaskId: null,
  queuedTaskIds: [],
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
