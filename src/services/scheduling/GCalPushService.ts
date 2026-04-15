import {
  createGoogleEvent,
  updateGoogleEvent,
  deleteGoogleEvent,
} from "@/lib/google-calendar";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "GCalPushService";

/**
 * Push scheduled tasks to Google Calendar as events.
 * Tasks are the source of truth; GCal events are mirrors.
 * This service runs async after scheduling and never blocks the scheduler.
 */

interface TaskForPush {
  id: string;
  title: string;
  description: string | null;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  status: string;
  gcalEventId: string | null;
  gcalFeedId: string | null;
  gcalSyncStatus: string | null;
  dueDate: Date | null;
  duration: number | null;
}

/**
 * Resolve the task calendar feed and its account for a user.
 * Returns null if no task calendar is configured or the feed is invalid.
 */
async function resolveTaskCalendar(userId: string) {
  const calSettings = await prisma.calendarSettings.findUnique({
    where: { userId },
    select: { taskCalendarId: true },
  });

  if (!calSettings?.taskCalendarId) return null;

  const feed = await prisma.calendarFeed.findUnique({
    where: { id: calSettings.taskCalendarId, userId },
    include: { account: true },
  });

  if (!feed || feed.type !== "GOOGLE" || !feed.url || !feed.accountId) {
    return null;
  }

  return { feedId: feed.id, accountId: feed.accountId, calendarId: feed.url };
}

/**
 * Get user timezone from settings, with fallback.
 */
async function getUserTimeZone(userId: string): Promise<string> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { timeZone: true },
  });
  return settings?.timeZone || "America/New_York";
}

/**
 * Push a single task to Google Calendar. Creates a new event.
 */
async function pushTask(
  task: TaskForPush,
  userId: string,
  accountId: string,
  calendarId: string,
  feedId: string,
  timeZone: string
): Promise<void> {
  if (!task.scheduledStart || !task.scheduledEnd) return;

  try {
    const gcalEvent = await createGoogleEvent(
      accountId,
      userId,
      calendarId,
      {
        title: task.title,
        description: [
          task.description || "",
          "\n[Managed by FluidCalendar]",
        ].join(""),
        start: task.scheduledStart,
        end: task.scheduledEnd,
        allDay: false,
      },
      timeZone
    );

    if (gcalEvent.id) {
      await prisma.task.update({
        where: { id: task.id },
        data: {
          gcalEventId: gcalEvent.id,
          gcalFeedId: feedId,
          gcalSyncStatus: "synced",
        },
      });
    }
  } catch (error) {
    // Let rate limit errors bubble up so the batch loop can stop
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      Number((error as { code: number | string }).code) === 429
    ) {
      await prisma.task.update({
        where: { id: task.id },
        data: { gcalSyncStatus: "error" },
      });
      throw error;
    }
    logger.error(
      "Failed to push task to GCal",
      {
        taskId: task.id,
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    await prisma.task.update({
      where: { id: task.id },
      data: { gcalSyncStatus: "error" },
    });
  }
}

/**
 * Update an existing GCal event for a rescheduled task.
 */
async function updateTask(
  task: TaskForPush,
  userId: string,
  accountId: string,
  calendarId: string,
  timeZone: string
): Promise<void> {
  if (!task.gcalEventId || !task.scheduledStart || !task.scheduledEnd) return;

  try {
    await updateGoogleEvent(
      accountId,
      userId,
      calendarId,
      task.gcalEventId,
      {
        title: task.title,
        start: task.scheduledStart,
        end: task.scheduledEnd,
        allDay: false,
      },
      timeZone
    );

    await prisma.task.update({
      where: { id: task.id },
      data: { gcalSyncStatus: "synced" },
    });
  } catch (error: unknown) {
    // If the event was deleted externally, clear the reference and re-push
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      Number((error as { code: number | string }).code) === 404
    ) {
      logger.info(
        "GCal event not found (deleted externally), clearing reference",
        { taskId: task.id, gcalEventId: task.gcalEventId },
        LOG_SOURCE
      );
      await prisma.task.update({
        where: { id: task.id },
        data: {
          gcalEventId: null,
          gcalFeedId: null,
          gcalSyncStatus: null,
        },
      });
      return;
    }

    // Let rate limit errors bubble up so the batch loop can stop
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      Number((error as { code: number | string }).code) === 429
    ) {
      await prisma.task.update({
        where: { id: task.id },
        data: { gcalSyncStatus: "error" },
      });
      throw error;
    }

    logger.error(
      "Failed to update task GCal event",
      {
        taskId: task.id,
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    await prisma.task.update({
      where: { id: task.id },
      data: { gcalSyncStatus: "error" },
    });
  }
}

/**
 * Remove a GCal event for a task (completed, deleted, or unscheduled).
 */
export async function removeTaskGCalEvent(
  task: { id: string; gcalEventId: string | null; gcalFeedId: string | null },
  userId: string
): Promise<void> {
  if (!task.gcalEventId || !task.gcalFeedId) return;

  const feed = await prisma.calendarFeed.findUnique({
    where: { id: task.gcalFeedId, userId },
    include: { account: true },
  });

  if (!feed || !feed.accountId || !feed.url) {
    // Feed gone, just clear the reference
    await prisma.task.update({
      where: { id: task.id },
      data: { gcalEventId: null, gcalFeedId: null, gcalSyncStatus: null },
    });
    return;
  }

  try {
    await deleteGoogleEvent(feed.accountId, userId, feed.url, task.gcalEventId);
  } catch (error: unknown) {
    // 404/410 means already deleted, that's fine
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      [404, 410].includes(Number((error as { code: number | string }).code))
    ) {
      // Already gone, no problem
    } else {
      logger.error(
        "Failed to delete task GCal event",
        {
          taskId: task.id,
          error: error instanceof Error ? error.message : String(error),
        },
        LOG_SOURCE
      );
    }
  }

  await prisma.task.update({
    where: { id: task.id },
    data: { gcalEventId: null, gcalFeedId: null, gcalSyncStatus: null },
  });
}

/**
 * Sync all scheduled tasks to Google Calendar after a scheduling run.
 * Called async (fire-and-forget) from the scheduling flow.
 *
 * Logic:
 * - Tasks with scheduledStart + no gcalEventId -> create
 * - Tasks with scheduledStart + gcalEventId -> update
 * - Tasks with no scheduledStart + gcalEventId -> delete (unscheduled)
 */
export async function syncScheduledTasksToGCal(
  userId: string,
  taskIds: string[]
): Promise<void> {
  const calendar = await resolveTaskCalendar(userId);
  if (!calendar) return; // Feature disabled

  const timeZone = await getUserTimeZone(userId);

  // Fetch tasks with GCal-relevant fields
  const tasks = await prisma.task.findMany({
    where: { id: { in: taskIds }, userId },
    select: {
      id: true,
      title: true,
      description: true,
      scheduledStart: true,
      scheduledEnd: true,
      status: true,
      gcalEventId: true,
      gcalFeedId: true,
      gcalSyncStatus: true,
      dueDate: true,
      duration: true,
    },
  });

  // Partition into create, update, delete
  const toCreate: TaskForPush[] = [];
  const toUpdate: TaskForPush[] = [];
  const toDelete: TaskForPush[] = [];

  for (const task of tasks) {
    if (task.status === "completed") {
      if (task.gcalEventId) toDelete.push(task);
      continue;
    }

    // Skip zero-duration tasks — they are all-day reminders, not timed GCal events
    if (!task.duration || task.duration <= 0) {
      if (task.gcalEventId) toDelete.push(task); // Clean up if previously pushed
      continue;
    }

    if (task.scheduledStart && task.scheduledEnd) {
      if (task.gcalEventId) {
        toUpdate.push(task);
      } else {
        toCreate.push(task);
      }
    } else if (task.gcalEventId) {
      toDelete.push(task);
    }
  }

  logger.info(
    "Syncing tasks to GCal",
    {
      userId,
      create: toCreate.length,
      update: toUpdate.length,
      delete: toDelete.length,
    },
    LOG_SOURCE
  );

  // Process sequentially with throttling.
  // If we hit a rate limit (429), stop immediately and let the next run pick up remaining tasks.
  const BATCH_SIZE = 5;
  const BATCH_DELAY_MS = 1100; // Just over 1 second to stay under per-second quota

  let rateLimited = false;

  const allOps = [
    ...toDelete.map((t) => () => removeTaskGCalEvent(t, userId)),
    ...toUpdate.map(
      (t) => () => updateTask(t, userId, calendar.accountId, calendar.calendarId, timeZone)
    ),
    ...toCreate.map(
      (t) => () =>
        pushTask(t, userId, calendar.accountId, calendar.calendarId, calendar.feedId, timeZone)
    ),
  ];

  for (let i = 0; i < allOps.length; i++) {
    if (rateLimited) break;

    try {
      await allOps[i]();
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        Number((error as { code: number | string }).code) === 429
      ) {
        logger.info(
          "GCal rate limit hit, stopping batch. Remaining tasks will sync on next run.",
          { processed: i, remaining: allOps.length - i },
          LOG_SOURCE
        );
        rateLimited = true;
        break;
      }
      // Other errors are already handled by individual functions
    }

    // Throttle after every batch
    if ((i + 1) % BATCH_SIZE === 0 && i + 1 < allOps.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  logger.info(
    rateLimited ? "GCal sync paused (rate limited)" : "GCal sync complete",
    { userId },
    LOG_SOURCE
  );
}
