import { CalendarEvent, CalendarFeed } from "@prisma/client";

import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import {
  type BatchUpdateFeedsInput,
  BatchUpdateFeedsInputSchema,
  type CreateFeedInput,
  CreateFeedInputSchema,
  type DeleteFeedInput,
  DeleteFeedInputSchema,
  type GetAllFeedsInput,
  GetAllFeedsInputSchema,
  type GetFeedByIdInput,
  GetFeedByIdInputSchema,
  type SyncFeedEventsInput,
  SyncFeedEventsInputSchema,
  type UpdateFeedInput,
  UpdateFeedInputSchema,
} from "./schemas";

const LOG_SOURCE = "FeedAPI";

// Extended feed type with relations
type FeedWithRelations = CalendarFeed & {
  events?: CalendarEvent[];
  account?: {
    id: string;
    provider: string;
    email: string;
  } | null;
};

/**
 * Get all calendar feeds for a user with filtering
 */
export async function getAllFeeds(
  userId: string,
  input: GetAllFeedsInput = { includeEvents: false, includeAccount: true }
): Promise<FeedWithRelations[]> {
  const validatedInput = GetAllFeedsInputSchema.parse(input);
  const { enabled, type, accountId, includeEvents, includeAccount } =
    validatedInput;

  logger.info(
    "Getting all feeds for user",
    {
      userId,
      filterCount: Object.keys(validatedInput).length,
    },
    LOG_SOURCE
  );

  const feeds = await prisma.calendarFeed.findMany({
    where: {
      userId,
      ...(enabled !== undefined && { enabled }),
      ...(type && { type }),
      ...(accountId && { accountId }),
    },
    include: {
      ...(includeEvents && { events: true }),
      ...(includeAccount && {
        account: {
          select: {
            id: true,
            provider: true,
            email: true,
          },
        },
      }),
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  logger.info(
    "Retrieved feeds for user",
    { userId, feedCount: feeds.length },
    LOG_SOURCE
  );

  return feeds;
}

/**
 * Get a specific calendar feed by ID
 */
export async function getFeedById(
  userId: string,
  input: GetFeedByIdInput
): Promise<FeedWithRelations | null> {
  const { feedId, includeEvents, includeAccount } =
    GetFeedByIdInputSchema.parse(input);

  logger.info(
    "Getting feed by ID",
    { userId, feedId, includeEvents, includeAccount },
    LOG_SOURCE
  );

  const feed = await prisma.calendarFeed.findUnique({
    where: {
      id: feedId,
      userId, // Ensure the feed belongs to the current user
    },
    include: {
      ...(includeEvents && { events: true }),
      ...(includeAccount && {
        account: {
          select: {
            id: true,
            provider: true,
            email: true,
          },
        },
      }),
    },
  });

  if (!feed) {
    logger.warn("Feed not found", { userId, feedId }, LOG_SOURCE);
    return null;
  }

  logger.info(
    "Retrieved feed",
    { userId, feedId, feedName: feed.name },
    LOG_SOURCE
  );

  return feed;
}

/**
 * Create a new calendar feed
 */
export async function createFeed(
  userId: string,
  input: CreateFeedInput
): Promise<FeedWithRelations> {
  const validatedInput = CreateFeedInputSchema.parse(input);

  logger.info(
    "Creating feed",
    { userId, name: validatedInput.name },
    LOG_SOURCE
  );

  const feed = await prisma.calendarFeed.create({
    data: {
      ...validatedInput,
      userId, // Associate the feed with the current user
    },
    include: {
      account: {
        select: {
          id: true,
          provider: true,
          email: true,
        },
      },
    },
  });

  logger.info(
    "Feed created successfully",
    { userId, feedId: feed.id, name: feed.name },
    LOG_SOURCE
  );

  return feed;
}

/**
 * Update an existing calendar feed
 */
export async function updateFeed(
  userId: string,
  feedId: string,
  input: UpdateFeedInput
): Promise<FeedWithRelations> {
  const validatedInput = UpdateFeedInputSchema.parse(input);

  logger.info("Updating feed", { userId, feedId }, LOG_SOURCE);

  // First, check if the feed exists and belongs to the user
  const existingFeed = await prisma.calendarFeed.findUnique({
    where: {
      id: feedId,
      userId,
    },
  });

  if (!existingFeed) {
    logger.warn(
      "Feed update failed - feed not found",
      { userId, feedId },
      LOG_SOURCE
    );
    throw new Error("Feed not found");
  }

  const updatedFeed = await prisma.calendarFeed.update({
    where: {
      id: feedId,
      userId, // Ensure the feed belongs to the current user
    },
    data: validatedInput,
    include: {
      account: {
        select: {
          id: true,
          provider: true,
          email: true,
        },
      },
    },
  });

  logger.info(
    "Feed updated successfully",
    { userId, feedId, name: updatedFeed.name },
    LOG_SOURCE
  );

  return updatedFeed;
}

/**
 * Batch update multiple calendar feeds
 */
export async function batchUpdateFeeds(
  userId: string,
  input: BatchUpdateFeedsInput
): Promise<{ success: boolean }> {
  const { feeds } = BatchUpdateFeedsInputSchema.parse(input);

  logger.info(
    "Batch updating feeds",
    { userId, feedCount: feeds.length },
    LOG_SOURCE
  );

  // Use transaction to ensure all updates succeed or none do
  await prisma.$transaction(
    feeds.map((feed) =>
      prisma.calendarFeed.update({
        where: {
          id: feed.id,
          userId, // Ensure the feed belongs to the current user
        },
        data: {
          enabled: feed.enabled,
          color: feed.color,
        },
      })
    )
  );

  logger.info(
    "Feeds batch updated successfully",
    { userId, feedCount: feeds.length },
    LOG_SOURCE
  );

  return { success: true };
}

/**
 * Delete a calendar feed
 */
export async function deleteFeed(
  userId: string,
  input: DeleteFeedInput
): Promise<{ success: boolean }> {
  const { feedId } = DeleteFeedInputSchema.parse(input);

  logger.info("Deleting feed", { userId, feedId }, LOG_SOURCE);

  // First, check if the feed exists and belongs to the user
  const existingFeed = await prisma.calendarFeed.findUnique({
    where: {
      id: feedId,
      userId,
    },
  });

  if (!existingFeed) {
    logger.warn(
      "Feed deletion failed - feed not found",
      { userId, feedId },
      LOG_SOURCE
    );
    throw new Error("Feed not found");
  }

  // The feed's events will be automatically deleted due to the cascade delete in the schema
  await prisma.calendarFeed.delete({
    where: {
      id: feedId,
      userId, // Ensure the feed belongs to the current user
    },
  });

  logger.info(
    "Feed deleted successfully",
    { userId, feedId, feedName: existingFeed.name },
    LOG_SOURCE
  );

  return { success: true };
}

/**
 * Sync events for a calendar feed
 */
export async function syncFeedEvents(
  userId: string,
  input: SyncFeedEventsInput
): Promise<{ success: boolean }> {
  const { feedId, events } = SyncFeedEventsInputSchema.parse(input);

  logger.info(
    "Syncing feed events",
    { userId, feedId, eventCount: events.length },
    LOG_SOURCE
  );

  // Verify the feed belongs to the current user
  const feed = await prisma.calendarFeed.findUnique({
    where: {
      id: feedId,
      userId,
    },
  });

  if (!feed) {
    logger.warn(
      "Feed sync failed - feed not found",
      { userId, feedId },
      LOG_SOURCE
    );
    throw new Error("Feed not found");
  }

  // Start a transaction to ensure data consistency
  await prisma.$transaction(async (tx) => {
    // Delete existing events for this feed
    await tx.calendarEvent.deleteMany({
      where: { feedId },
    });

    // Insert new events
    if (events && events.length > 0) {
      await tx.calendarEvent.createMany({
        data: events.map((event) => ({
          ...event,
          feedId,
          // Convert Date objects to strings for database storage
          start: newDate(event.start).toISOString(),
          end: newDate(event.end).toISOString(),
          created: event.created
            ? newDate(event.created).toISOString()
            : undefined,
          lastModified: event.lastModified
            ? newDate(event.lastModified).toISOString()
            : undefined,
        })),
      });
    }

    // Update feed's lastSync timestamp
    await tx.calendarFeed.update({
      where: { id: feedId, userId },
      data: { lastSync: newDate() },
    });
  });

  logger.info(
    "Feed events synced successfully",
    { userId, feedId, eventCount: events.length },
    LOG_SOURCE
  );

  return { success: true };
}
