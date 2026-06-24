import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ApiHttpError, v1Write, v1Read } from "@/lib/api/v1";
import { parseApiDate } from "@/lib/api/dates";

const LOG_SOURCE = "v1-events-id-route";

/**
 * GET /api/v1/events/[id] — get a single event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return v1Read(request, async ({ userId }) => {
    const { id } = await params;
    return getEvent(userId, id);
  });
}

/**
 * PATCH /api/v1/events/[id] — update a single event
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return v1Write(request, "PATCH /api/v1/events/[id]", async ({ userId }) => {
    const { id } = await params;
    return updateEvent(userId, id, request);
  });
}

/**
 * DELETE /api/v1/events/[id] — delete a single event
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return v1Write(
    request,
    "DELETE /api/v1/events/[id]",
    async ({ userId }) => {
      const { id } = await params;
      return deleteEvent(userId, id);
    }
  );
}

async function getEvent(userId: string, eventId: string) {
  // Fetch event and check ownership via feed.userId
  const event = await prisma.calendarEvent.findUnique({
    where: { id: eventId },
    include: { feed: true },
  });

  if (!event || event.feed.userId !== userId) {
    throw new ApiHttpError("NOT_FOUND", "Event not found");
  }

  logger.debug(`Retrieved event ${eventId} for user ${userId}`, {}, LOG_SOURCE);

  return {
    status: 200,
    body: event,
  };
}

async function updateEvent(
  userId: string,
  eventId: string,
  request: NextRequest
) {
  // Check ownership first
  const event = await prisma.calendarEvent.findUnique({
    where: { id: eventId },
    include: { feed: true },
  });

  if (!event || event.feed.userId !== userId) {
    throw new ApiHttpError("NOT_FOUND", "Event not found");
  }

  const updates = await request.json();
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    throw new ApiHttpError("INVALID_ARGUMENT", "Body must be a JSON object");
  }

  // Validate if start/end are being updated (strict RFC 3339)
  if (updates.start || updates.end) {
    const startTime = updates.start
      ? parseApiDate(updates.start, "start").getTime()
      : event.start.getTime();
    const endTime = updates.end
      ? parseApiDate(updates.end, "end").getTime()
      : event.end.getTime();

    if (endTime <= startTime) {
      throw new ApiHttpError(
        "INVALID_ARGUMENT",
        "end must be after start",
        { field: "end" }
      );
    }
  }

  // Validate title if present
  if (updates.title !== undefined && !updates.title) {
    throw new ApiHttpError(
      "INVALID_ARGUMENT",
      "title cannot be empty",
      { field: "title" }
    );
  }

  // Explicit allow-list — never let the caller move the event to another feed
  // (feedId) or touch sync/recurrence-internal columns (masterEventId, etc.).
  const data: Prisma.CalendarEventUpdateInput = {};
  if ("title" in updates) data.title = updates.title;
  if ("description" in updates) data.description = updates.description;
  if ("location" in updates) data.location = updates.location;
  if ("allDay" in updates) data.allDay = updates.allDay;
  if ("isRecurring" in updates) data.isRecurring = updates.isRecurring;
  if ("recurrenceRule" in updates) data.recurrenceRule = updates.recurrenceRule;
  if ("start" in updates) data.start = parseApiDate(updates.start, "start");
  if ("end" in updates) data.end = parseApiDate(updates.end, "end");

  const updated = await prisma.calendarEvent.update({
    where: { id: eventId },
    data,
    include: { feed: true },
  });

  logger.info(`Updated event ${eventId} for user ${userId}`, {}, LOG_SOURCE);

  return {
    status: 200,
    body: updated,
  };
}

async function deleteEvent(userId: string, eventId: string) {
  // Check ownership first
  const event = await prisma.calendarEvent.findUnique({
    where: { id: eventId },
    include: { feed: true },
  });

  if (!event || event.feed.userId !== userId) {
    throw new ApiHttpError("NOT_FOUND", "Event not found");
  }

  await prisma.calendarEvent.delete({
    where: { id: eventId },
  });

  logger.info(`Deleted event ${eventId} for user ${userId}`, {}, LOG_SOURCE);

  return {
    status: 200,
    body: { deleted: true, id: eventId },
  };
}
