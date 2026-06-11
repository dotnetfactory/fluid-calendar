import {
  createGoogleEvent,
  deleteGoogleEvent,
  updateGoogleEvent,
} from "@/lib/google-calendar";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "task-block-push";

/**
 * Pushes a task's scheduled block to Google Calendar.
 * Handles create, update, or delete of the calendar event based on current state.
 */
export async function pushTaskBlock(userId: string, taskId: string) {
  try {
    // Load task and user settings in parallel
    const [task, settings] = await Promise.all([
      prisma.task.findUnique({
        where: { id: taskId, userId },
      }),
      prisma.autoScheduleSettings.findUnique({
        where: { userId },
      }),
    ]);

    if (!task) {
      logger.warn(`Task not found for push: ${taskId}`, { userId }, LOG_SOURCE);
      return;
    }

    if (!settings) {
      logger.warn(
        `AutoScheduleSettings not found for push`,
        { userId },
        LOG_SOURCE
      );
      return;
    }

    // Determine desired state
    const shouldExist =
      settings.pushTasksToCalendar &&
      settings.pushTasksFeedId &&
      task.scheduledStart &&
      task.scheduledEnd &&
      task.status !== "completed";

    // Load the calendar feed if needed
    let feed = null;
    let accountId = null;
    let calendarId = null;

    if (shouldExist || task.blockEventId) {
      feed = await prisma.calendarFeed.findUnique({
        where: { id: settings.pushTasksFeedId || "" },
        include: { account: true },
      });

      if (!feed) {
        logger.warn(
          `Calendar feed not found: ${settings.pushTasksFeedId}`,
          { userId },
          LOG_SOURCE
        );
        if (task.blockEventId) {
          // If event exists but feed is gone, mark as dirty
          await prisma.task.update({
            where: { id: taskId },
            data: { blockDirty: true },
          });
        }
        return;
      }

      // Validate feed is GOOGLE type
      if (feed.type !== "GOOGLE") {
        logger.error(
          `Feed must be GOOGLE type for task block push`,
          { feedId: feed.id, feedType: feed.type, userId },
          LOG_SOURCE
        );
        return;
      }

      // Validate feed has required fields
      if (!feed.account || !feed.url) {
        logger.error(
          `Feed missing account or URL`,
          { feedId: feed.id, userId },
          LOG_SOURCE
        );
        return;
      }

      accountId = feed.accountId!;
      // feed.url contains the Google Calendar ID
      calendarId = feed.url;
    }

    // Handle state transitions
    if (shouldExist && !task.blockEventId) {
      // Create new event
      try {
        logger.debug(
          `Creating calendar event for task`,
          {
            taskId,
            taskTitle: task.title,
            start: task.scheduledStart?.toISOString() || null,
            end: task.scheduledEnd?.toISOString() || null,
          },
          LOG_SOURCE
        );

        const event = await createGoogleEvent(
          accountId!,
          userId,
          calendarId!,
          {
            title: task.title,
            description: "Scheduled by FluidCalendar",
            start: task.scheduledStart!,
            end: task.scheduledEnd!,
          }
        );

        if (event.id) {
          await prisma.task.update({
            where: { id: taskId },
            data: {
              blockEventId: event.id,
              blockDirty: false,
            },
          });

          logger.info(
            `Created calendar event for task`,
            { taskId, eventId: event.id, userId },
            LOG_SOURCE
          );
        }
      } catch (error) {
        logger.error(
          `Failed to create calendar event`,
          {
            taskId,
            error: error instanceof Error ? error.message : String(error),
            userId,
          },
          LOG_SOURCE
        );

        await prisma.task.update({
          where: { id: taskId },
          data: { blockDirty: true },
        });
      }
    } else if (shouldExist && task.blockEventId) {
      // Update existing event
      try {
        logger.debug(
          `Updating calendar event for task`,
          {
            taskId,
            eventId: task.blockEventId || null,
            taskTitle: task.title,
            start: task.scheduledStart?.toISOString() || null,
            end: task.scheduledEnd?.toISOString() || null,
          },
          LOG_SOURCE
        );

        await updateGoogleEvent(
          accountId!,
          userId,
          calendarId!,
          task.blockEventId!,
          {
            title: task.title,
            description: "Scheduled by FluidCalendar",
            start: task.scheduledStart || undefined,
            end: task.scheduledEnd || undefined,
            mode: "single",
          }
        );

        await prisma.task.update({
          where: { id: taskId },
          data: { blockDirty: false },
        });

        logger.info(
          `Updated calendar event for task`,
          { taskId, eventId: task.blockEventId, userId },
          LOG_SOURCE
        );
      } catch (error) {
        logger.error(
          `Failed to update calendar event`,
          {
            taskId,
            eventId: task.blockEventId,
            error: error instanceof Error ? error.message : String(error),
            userId,
          },
          LOG_SOURCE
        );

        await prisma.task.update({
          where: { id: taskId },
          data: { blockDirty: true },
        });
      }
    } else if (!shouldExist && task.blockEventId) {
      // Delete existing event
      try {
        logger.debug(
          `Deleting calendar event for task`,
          { taskId, eventId: task.blockEventId },
          LOG_SOURCE
        );

        await deleteGoogleEvent(
          accountId!,
          userId,
          calendarId!,
          task.blockEventId,
          "single"
        );

        await prisma.task.update({
          where: { id: taskId },
          data: {
            blockEventId: null,
            blockDirty: false,
          },
        });

        logger.info(
          `Deleted calendar event for task`,
          { taskId, eventId: task.blockEventId, userId },
          LOG_SOURCE
        );
      } catch (error) {
        logger.error(
          `Failed to delete calendar event`,
          {
            taskId,
            eventId: task.blockEventId,
            error: error instanceof Error ? error.message : String(error),
            userId,
          },
          LOG_SOURCE
        );

        await prisma.task.update({
          where: { id: taskId },
          data: { blockDirty: true },
        });
      }
    }
  } catch (error) {
    logger.error(
      `Error in pushTaskBlock`,
      {
        taskId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
  }
}

/**
 * Fire-and-forget wrapper for pushing a task block.
 * Calls pushTaskBlock asynchronously without blocking the caller.
 */
export function schedulePushTaskBlock(userId: string, taskId: string): void {
  pushTaskBlock(userId, taskId).catch((error) => {
    logger.error(
      `Unhandled error in schedulePushTaskBlock`,
      {
        taskId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
  });
}

/**
 * Deletes a calendar event for a task that no longer exists in the database.
 * Call this AFTER deleting the task from Prisma if it had a blockEventId.
 */
export async function deleteTaskBlockEvent(
  userId: string,
  blockEventId: string,
  feedId: string
) {
  try {
    logger.debug(
      `Deleting orphaned calendar event`,
      { blockEventId, feedId, userId },
      LOG_SOURCE
    );

    const feed = await prisma.calendarFeed.findUnique({
      where: { id: feedId },
      include: { account: true },
    });

    if (!feed || !feed.account) {
      logger.warn(
        `Feed not found for orphaned event deletion`,
        { feedId, userId },
        LOG_SOURCE
      );
      return;
    }

    if (feed.type !== "GOOGLE" || !feed.url) {
      logger.warn(
        `Cannot delete event from non-GOOGLE feed`,
        { feedId, feedType: feed.type, userId },
        LOG_SOURCE
      );
      return;
    }

    await deleteGoogleEvent(
      feed.accountId!,
      userId,
      feed.url,
      blockEventId,
      "single"
    );

    logger.info(
      `Deleted orphaned calendar event`,
      { blockEventId, feedId, userId },
      LOG_SOURCE
    );
  } catch (error) {
    logger.error(
      `Failed to delete orphaned calendar event`,
      {
        blockEventId,
        feedId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
  }
}

/**
 * Repushes all dirty blocks for a user.
 * Called after schedule-all completes to reconcile event state.
 */
export async function repushDirtyBlocks(userId: string) {
  try {
    logger.info(
      `Starting repush of dirty blocks`,
      { userId },
      LOG_SOURCE
    );

    // Find tasks that need pushing
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        OR: [
          { blockDirty: true },
          {
            AND: [
              { scheduledStart: { not: null } },
              { scheduledEnd: { not: null } },
              { blockEventId: null },
              { status: { not: "completed" } },
            ],
          },
        ],
      },
    });

    logger.debug(
      `Found tasks for repush`,
      { userId, count: tasks.length },
      LOG_SOURCE
    );

    // Check if push is enabled
    const settings = await prisma.autoScheduleSettings.findUnique({
      where: { userId },
    });

    if (!settings?.pushTasksToCalendar) {
      logger.debug(
        `Push disabled, skipping repush`,
        { userId },
        LOG_SOURCE
      );
      return;
    }

    // Push each task sequentially
    for (const task of tasks) {
      await pushTaskBlock(userId, task.id);
    }

    logger.info(
      `Completed repush of dirty blocks`,
      { userId, count: tasks.length },
      LOG_SOURCE
    );
  } catch (error) {
    logger.error(
      `Error in repushDirtyBlocks`,
      {
        userId,
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
  }
}
