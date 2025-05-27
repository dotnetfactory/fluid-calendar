import { CalendarEvent, CalendarFeed } from "@prisma/client";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import {
  type CreateEventInput,
  CreateEventInputSchema,
  type DeleteEventInput,
  DeleteEventInputSchema,
  type GetAllEventsInput,
  GetAllEventsInputSchema,
  type GetEventByIdInput,
  GetEventByIdInputSchema,
  type UpdateEventInput,
  UpdateEventInputSchema,
} from "./schemas";

const LOG_SOURCE = "EventAPI";

// Extended event type with relations
type EventWithRelations = CalendarEvent & {
  feed?: Partial<CalendarFeed> | null;
};

/**
 * Get all events for a user with filtering
 */
export async function getAllEvents(
  userId: string,
  input: GetAllEventsInput = {}
): Promise<EventWithRelations[]> {
  const validatedInput = GetAllEventsInputSchema.parse(input);
  const { feedIds, startDate, endDate, search, isRecurring, allDay } =
    validatedInput;

  logger.info(
    "Getting all events for user",
    {
      userId,
      filterCount: Object.keys(validatedInput).length,
    },
    LOG_SOURCE
  );

  const events = await prisma.calendarEvent.findMany({
    where: {
      feed: {
        userId,
        ...(feedIds && feedIds.length > 0 && { id: { in: feedIds } }),
      },
      ...(startDate &&
        endDate && {
          start: {
            gte: startDate,
            lte: endDate,
          },
        }),
      ...(search && {
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
          { location: { contains: search } },
        ],
      }),
      ...(isRecurring !== undefined && { isRecurring }),
      ...(allDay !== undefined && { allDay }),
    },
    include: {
      feed: {
        select: {
          id: true,
          name: true,
          color: true,
          userId: true,
        },
      },
    },
    orderBy: {
      start: "asc",
    },
  });

  logger.info(
    "Retrieved events for user",
    { userId, eventCount: events.length },
    LOG_SOURCE
  );

  return events;
}

/**
 * Get a specific event by ID
 */
export async function getEventById(
  userId: string,
  input: GetEventByIdInput
): Promise<EventWithRelations | null> {
  const { eventId, includeFeed } = GetEventByIdInputSchema.parse(input);

  logger.info(
    "Getting event by ID",
    { userId, eventId, includeFeed },
    LOG_SOURCE
  );

  let event: EventWithRelations | null;

  if (includeFeed) {
    // Get event with feed info using Prisma directly for type consistency
    event = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
      include: {
        feed: {
          select: {
            id: true,
            name: true,
            color: true,
            userId: true,
          },
        },
      },
    });
  } else {
    // Get event without feed info
    event = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });
  }

  if (!event) {
    logger.warn("Event not found", { userId, eventId }, LOG_SOURCE);
    return null;
  }

  // Check if the event belongs to a feed owned by the current user
  if (includeFeed && event.feed && event.feed.userId !== userId) {
    logger.warn(
      "Unauthorized access attempt to event",
      { userId, eventId },
      LOG_SOURCE
    );
    return null;
  }

  // If we didn't include feed info, we need to verify ownership separately
  if (!includeFeed) {
    const feedCheck = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
      include: { feed: { select: { userId: true } } },
    });

    if (!feedCheck || feedCheck.feed.userId !== userId) {
      logger.warn(
        "Unauthorized access attempt to event",
        { userId, eventId },
        LOG_SOURCE
      );
      return null;
    }
  }

  logger.info(
    "Retrieved event",
    { userId, eventId, eventTitle: event.title },
    LOG_SOURCE
  );

  return event;
}

/**
 * Create a new event
 */
export async function createEvent(
  userId: string,
  input: CreateEventInput
): Promise<EventWithRelations> {
  const validatedInput = CreateEventInputSchema.parse(input);
  const { feedId, ...eventData } = validatedInput;

  logger.info(
    "Creating event",
    { userId, title: eventData.title, feedId },
    LOG_SOURCE
  );

  // Check if the feed belongs to the current user
  const feed = await prisma.calendarFeed.findUnique({
    where: {
      id: feedId,
      userId,
    },
    include: {
      account: true,
    },
  });

  if (!feed) {
    logger.warn(
      "Feed not found or unauthorized",
      { userId, feedId },
      LOG_SOURCE
    );
    throw new Error(
      "Calendar feed not found or you don't have permission to access it"
    );
  }

  // Create event in database
  const event = await prisma.calendarEvent.create({
    data: {
      feedId,
      title: eventData.title,
      description: eventData.description,
      start: eventData.start,
      end: eventData.end,
      location: eventData.location,
      isRecurring: eventData.isRecurring,
      recurrenceRule: eventData.recurrenceRule,
      allDay: eventData.allDay,
    },
    include: {
      feed: {
        select: {
          id: true,
          name: true,
          color: true,
          userId: true,
        },
      },
    },
  });

  logger.info(
    "Event created successfully",
    { userId, eventId: event.id, title: event.title },
    LOG_SOURCE
  );

  return event;
}

/**
 * Update an existing event
 */
export async function updateEvent(
  userId: string,
  eventId: string,
  input: UpdateEventInput
): Promise<EventWithRelations> {
  const validatedInput = UpdateEventInputSchema.parse(input);
  const updates = { ...validatedInput };
  delete updates.id; // Remove id from updates

  logger.info("Updating event", { userId, eventId }, LOG_SOURCE);

  // Check if the event belongs to a feed owned by the current user
  const existingEvent = await prisma.calendarEvent.findUnique({
    where: { id: eventId },
    include: {
      feed: true,
    },
  });

  if (!existingEvent || existingEvent.feed.userId !== userId) {
    logger.warn(
      "Event update failed - not found or unauthorized",
      { userId, eventId },
      LOG_SOURCE
    );
    throw new Error(
      "Event not found or you don't have permission to update it"
    );
  }

  const updatedEvent = await prisma.calendarEvent.update({
    where: { id: eventId },
    data: {
      ...updates,
      // Convert dates if they're provided
      ...(updates.start && { start: updates.start }),
      ...(updates.end && { end: updates.end }),
    },
    include: {
      feed: {
        select: {
          id: true,
          name: true,
          color: true,
          userId: true,
        },
      },
    },
  });

  logger.info(
    "Event updated successfully",
    { userId, eventId, title: updatedEvent.title },
    LOG_SOURCE
  );

  return updatedEvent;
}

/**
 * Delete an event
 */
export async function deleteEvent(
  userId: string,
  input: DeleteEventInput
): Promise<{ success: boolean }> {
  const { eventId } = DeleteEventInputSchema.parse(input);

  logger.info("Deleting event", { userId, eventId }, LOG_SOURCE);

  // Check if the event belongs to a feed owned by the current user
  const existingEvent = await prisma.calendarEvent.findUnique({
    where: { id: eventId },
    include: {
      feed: true,
    },
  });

  if (!existingEvent || existingEvent.feed.userId !== userId) {
    logger.warn(
      "Event deletion failed - not found or unauthorized",
      { userId, eventId },
      LOG_SOURCE
    );
    throw new Error(
      "Event not found or you don't have permission to delete it"
    );
  }

  await prisma.calendarEvent.delete({
    where: { id: eventId },
  });

  logger.info(
    "Event deleted successfully",
    { userId, eventId, eventTitle: existingEvent.title },
    LOG_SOURCE
  );

  return { success: true };
}
