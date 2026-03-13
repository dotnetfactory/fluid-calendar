import { logger } from "./logger";

const LOG_SOURCE = "GhostTaskFilter";

/**
 * Known deleted list IDs that contain ghost records
 * Add more as you discover them during sync operations
 */
const KNOWN_DELETED_LIST_IDS = new Set([
  "AAMkAGQzMDBjY2FlLTJjN2UtNGYzYy1iZGRlLWVlZmE0NDE1ZjM0MgAuAAAAAABC94Ugf99QSaXYfjjENvSJAQAeWuVmndQBTKUeq6ugpJtgAAPT7_LRAAA=",
  // Add more deleted list IDs here as you discover them
]);

/**
 * Known ghost task IDs that should be filtered out
 * Populate this set as you identify specific ghost tasks
 */
const KNOWN_GHOST_TASK_IDS = new Set<string>([
  // Will be populated dynamically or from a database
]);

interface TaskData {
  id: string;
  title?: string;
  status?: string;
  listId?: string;
  parentListId?: string;
  listName?: string;
  listDisplayName?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  dueDateTime?: { dateTime?: string } | null;
  startDateTime?: { dateTime?: string } | null;
  recurrence?: {
    pattern?: { type?: string };
    range?: { endDate?: string };
  } | null;
  [key: string]: unknown;
}

/**
 * Comprehensive filter for identifying and blocking ghost/cached Microsoft Todo tasks
 */
export class GhostTaskFilter {
  private validListIds: Set<string>;
  private filteredCount: number = 0;
  private allowedCount: number = 0;

  constructor(validListIds: string[] = []) {
    this.validListIds = new Set(validListIds);
  }

  /**
   * Update the list of valid list IDs (call this before each sync)
   */
  updateValidListIds(validListIds: string[]): void {
    this.validListIds = new Set(validListIds);
  }

  /**
   * Main filter method - returns true if task should be synced, false if it's a ghost
   */
  shouldSyncTask(task: TaskData): boolean {
    const ghostReasons: string[] = [];

    // Test 1: Check if task ID is in known ghost list
    if (KNOWN_GHOST_TASK_IDS.has(task.id)) {
      ghostReasons.push("known_ghost_task_id");
    }

    // Test 2: Check if from deleted list
    const taskListId = task.listId || task.parentListId;
    if (taskListId && KNOWN_DELETED_LIST_IDS.has(taskListId)) {
      ghostReasons.push("deleted_list_id");
    }

    // Test 3: Check if list ID is invalid (not in current valid lists)
    if (
      taskListId &&
      this.validListIds.size > 0 &&
      !this.validListIds.has(taskListId)
    ) {
      ghostReasons.push("invalid_list_id");
    }

    // Test 4: Check for specific ghost patterns
    if (this.matchesGhostPattern(task)) {
      ghostReasons.push("ghost_pattern_match");
    }

    // Test 5: Check for legacy field combinations
    if (this.hasLegacyFieldPattern(task)) {
      ghostReasons.push("legacy_field_pattern");
    }

    // Test 6: Check for suspicious timestamps
    if (this.hasSuspiciousTimestamps(task)) {
      ghostReasons.push("suspicious_timestamps");
    }

    // Test 7: Check for "Unknown List" - simple but effective ghost indicator
    if (this.isFromUnknownList(task)) {
      ghostReasons.push("unknown_list_name");
    }

    const isGhost = ghostReasons.length > 0;

    if (isGhost) {
      this.filteredCount++;
      // Optionally save ghost task IDs for future filtering
      KNOWN_GHOST_TASK_IDS.add(task.id);
      return false; // Don't sync ghost tasks
    } else {
      this.allowedCount++;
      return true; // Sync live tasks
    }
  }

  /**
   * Check if task matches known ghost patterns
   */
  private matchesGhostPattern(task: TaskData): boolean {
    // Pattern 1: Bookkeeping tasks with weekly recurrence and notStarted status
    if (
      task.title === "Bookkeeping" &&
      task.status === "notStarted" &&
      task.recurrence?.pattern?.type === "weekly"
    ) {
      return true;
    }

    // Pattern 2: Tasks with extremely future due dates (likely orphaned)
    if (task.dueDateTime?.dateTime) {
      const dueDate = new Date(task.dueDateTime.dateTime);
      const now = new Date();
      const yearsDiff =
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365);

      if (yearsDiff > 2) {
        // Due date more than 2 years in future
        return true;
      }
    }

    // Pattern 3: Tasks with very old creation but recent modification (sign of caching)
    if (task.createdDateTime && task.lastModifiedDateTime) {
      const created = new Date(task.createdDateTime);
      const modified = new Date(task.lastModifiedDateTime);
      const daysBetween =
        (modified.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

      if (daysBetween > 30) {
        // Modified more than 30 days after creation
        return true;
      }
    }

    return false;
  }

  /**
   * Check for legacy field patterns that indicate ghost records
   */
  private hasLegacyFieldPattern(task: TaskData): boolean {
    // Based on forensic analysis: ghost tasks often have extra fields
    const hasAllLegacyFields = !!(
      task.dueDateTime &&
      task.recurrence &&
      task.startDateTime
    );

    // Recurring tasks with no clear end date are suspicious
    const hasOpenEndedRecurrence = !!(
      task.recurrence && !task.recurrence.range?.endDate
    );

    return hasAllLegacyFields || hasOpenEndedRecurrence;
  }

  /**
   * Check for suspicious timestamp patterns
   */
  private hasSuspiciousTimestamps(task: TaskData): boolean {
    if (!task.createdDateTime) return false;

    const created = new Date(task.createdDateTime);
    const now = new Date();

    // Tasks created more than 2 years ago might be stale
    const yearsSinceCreated =
      (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 365);

    if (yearsSinceCreated > 2) {
      return true;
    }

    return false;
  }

  /**
   * Check if task is from an "Unknown List"
   */
  private isFromUnknownList(task: TaskData): boolean {
    const listName = task.listName || task.listDisplayName || "";
    return listName.toLowerCase().includes("unknown");
  }

  /**
   * Add a known ghost task ID to the filter
   */
  addGhostTaskId(taskId: string): void {
    KNOWN_GHOST_TASK_IDS.add(taskId);
  }

  /**
   * Add a known deleted list ID to the filter
   */
  addDeletedListId(listId: string): void {
    KNOWN_DELETED_LIST_IDS.add(listId);
  }

  /**
   * Get statistics about filtering performance
   */
  getStats(): { filtered: number; allowed: number; total: number } {
    return {
      filtered: this.filteredCount,
      allowed: this.allowedCount,
      total: this.filteredCount + this.allowedCount,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.filteredCount = 0;
    this.allowedCount = 0;
  }

  /**
   * Log a summary of filtering results
   */
  logSummary(): void {
    const stats = this.getStats();
    if (stats.filtered > 0) {
      logger.info(
        "Ghost task filtering summary",
        {
          filtered: stats.filtered,
          allowed: stats.allowed,
          total: stats.total,
        },
        LOG_SOURCE
      );
    }
  }
}

/**
 * Convenience function to filter an array of tasks
 */
export function filterGhostTasks(
  tasks: TaskData[],
  validListIds: string[] = []
): TaskData[] {
  const filter = new GhostTaskFilter(validListIds);
  return tasks.filter((task) => filter.shouldSyncTask(task));
}

/**
 * Create a reusable filter function for sync operations
 */
export function createSyncFilter(
  validListIds: string[] = []
): (task: TaskData) => boolean {
  const filter = new GhostTaskFilter(validListIds);
  return (task: TaskData) => filter.shouldSyncTask(task);
}
