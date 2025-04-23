/**
 * Represents the state of a focus mode session
 */
export interface FocusMode {
  currentTaskId: string | null;
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
 * Default values for a new focus mode session
 */
export const DEFAULT_FOCUS_MODE: FocusMode = {
  currentTaskId: null,
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
