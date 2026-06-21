import { Prisma } from "@prisma/client";

/**
 * The minimal shape of a source task needed to build a duplicate. This is a
 * subset of the Prisma `Task` model plus its connected tag ids, so the helper
 * can be exercised in unit tests without a database.
 */
export interface DuplicableTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: Date | null;
  startDate: Date | null;
  duration: number | null;
  priority: string | null;
  energyLevel: string | null;
  preferredTime: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  // instance/sync state (intentionally NOT carried over)
  isAutoScheduled: boolean;
  scheduleLocked: boolean;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  scheduleScore: number | null;
  lastScheduled: Date | null;
  postponedUntil: Date | null;
  blockEventId: string | null;
  blockFeedId: string | null;
  blockDirty: boolean;
  completedAt: Date | null;
  lastCompletedDate: Date | null;
  externalTaskId: string | null;
  source: string | null;
  externalListId: string | null;
  externalCreatedAt: Date | null;
  externalUpdatedAt: Date | null;
  lastSyncedAt: Date | null;
  syncStatus: string | null;
  syncError: string | null;
  syncHash: string | null;
  skipSync: boolean;
  userId: string | null;
  tags: { id: string }[];
}

/**
 * Build the Prisma create payload for a single duplicated task.
 *
 * Carries over template-relevant, user-owned fields (title, description,
 * status, dates, duration, priority, energy level, preferred time, recurrence,
 * and tag associations) and resets every instance- or sync-specific field so
 * the copy behaves as a fresh, unscheduled task in the new project. The copied
 * task is owned by `userId` (the user performing the duplication), never the
 * source row's owner, and is attached to `newProjectId`.
 *
 * Sync/schedule/block/lifecycle fields are simply omitted so the Prisma schema
 * defaults (null / false) apply to the new row.
 */
export function buildDuplicatedTaskData(
  task: DuplicableTask,
  newProjectId: string,
  userId: string
): Prisma.TaskUncheckedCreateInput {
  const data: Prisma.TaskUncheckedCreateInput = {
    title: task.title,
    description: task.description,
    status: task.status,
    dueDate: task.dueDate,
    startDate: task.startDate,
    duration: task.duration,
    priority: task.priority,
    energyLevel: task.energyLevel,
    preferredTime: task.preferredTime,
    isRecurring: task.isRecurring,
    recurrenceRule: task.recurrenceRule,
    projectId: newProjectId,
    userId,
  };

  if (task.tags.length > 0) {
    data.tags = { connect: task.tags.map((tag) => ({ id: tag.id })) };
  }

  return data;
}
