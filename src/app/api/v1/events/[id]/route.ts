import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ApiHttpError, v1Write, v1Read } from "@/lib/api/v1";

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

  // Validate if start/end are being updated
  if (updates.start || updates.end) {
    const startTime = updates.start
      ? new Date(updates.start).getTime()
      : event.start.getTime();
    const endTime = updates.end
      ? new Date(updates.end).getTime()
      : event.end.getTime();

    if (isNaN(startTime)) {
      throw new ApiHttpError(
        "INVALID_ARGUMENT",
        "start must be a valid ISO date",
        { field: "start" }
      );
    }

    if (isNaN(endTime)) {
      throw new ApiHttpError(
        "INVALID_ARGUMENT",
        "end must be a valid ISO date",
        { field: "end" }
      );
    }

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

  // Transform date strings to Date objects
  const data: Prisma.CalendarEventUpdateInput = { ...updates };
  if (data.start) data.start = new Date(String(data.start));
  if (data.end) data.end = new Date(String(data.end));

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
