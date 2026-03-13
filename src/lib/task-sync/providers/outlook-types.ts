/**
 * Outlook task priority values
 */
export enum OutlookPriority {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
}

/**
 * Outlook task status values
 */
export enum OutlookStatus {
  NOT_STARTED = "notStarted",
  IN_PROGRESS = "inProgress",
  COMPLETED = "completed",
  WAITING_ON_OTHERS = "waitingOnOthers",
  DEFERRED = "deferred",
}

/**
 * Map between our internal priority values and Outlook priority values
 */
export const priorityMap = {
  [OutlookPriority.HIGH]: "high",
  [OutlookPriority.NORMAL]: "normal",
  [OutlookPriority.LOW]: "low",
};
