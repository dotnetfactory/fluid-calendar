import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { isWritableFeedType } from "@/lib/calendar-drag";
import { getEvent } from "@/lib/calendar-db";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "event-route";

// Get a specific event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { id } = await params;
    const event = await getEvent(id);

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if the event belongs to a feed owned by the current user
    if (event.feed.userId !== userId) {
      logger.warn(
        "Unauthorized access attempt to event",
        { eventId: id, userId: userId || "unknown" },
        LOG_SOURCE
      );
      return NextResponse.json(
        { error: "Event not found or you don't have permission to access it" },
        { status: 404 }
      );
    }

    return NextResponse.json(event);
  } catch (error) {
    logger.error(
      "Failed to fetch event:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch event" },
      { status: 500 }
    );
  }
}

// Update a specific event
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { id } = await params;

    // Check if the event belongs to a feed owned by the current user
    const existingEvent = await prisma.calendarEvent.findUnique({
      where: { id },
      include: {
        feed: true,
      },
    });

    if (!existingEvent || existingEvent.feed.userId !== userId) {
      logger.warn(
        "Unauthorized access attempt to update event",
        { eventId: id, userId: userId || "unknown" },
        LOG_SOURCE
      );
      return NextResponse.json(
        { error: "Event not found or you don't have permission to update it" },
        { status: 404 }
      );
    }

    if (!isWritableFeedType(existingEvent.feed.type)) {
      return NextResponse.json(
        { error: "This calendar is read-only" },
        { status: 403 }
      );
    }

    // Whitelist mutable presentation fields. Spreading the raw body would let a
    // caller smuggle `feedId` (moving the event into a read-only ICAL feed or
    // another user's feed, bypassing the writable check above) or overwrite
    // identity columns like `id`/`userId`. Only accept fields a user may edit.
    const body = await request.json();
    const allowedFields = [
      "title",
      "description",
      "location",
      "start",
      "end",
      "allDay",
      "isRecurring",
      "recurrenceRule",
      "status",
    ] as const;
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) updates[field] = body[field];
    }

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error(
      "Failed to update event:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

// Delete a specific event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { id } = await params;

    // Check if the event belongs to a feed owned by the current user
    const existingEvent = await prisma.calendarEvent.findUnique({
      where: { id },
      include: {
        feed: true,
      },
    });

    if (!existingEvent || existingEvent.feed.userId !== userId) {
      logger.warn(
        "Unauthorized access attempt to delete event",
        { eventId: id, userId: userId || "unknown" },
        LOG_SOURCE
      );
      return NextResponse.json(
        { error: "Event not found or you don't have permission to delete it" },
        { status: 404 }
      );
    }

    if (!isWritableFeedType(existingEvent.feed.type)) {
      return NextResponse.json(
        { error: "This calendar is read-only" },
        { status: 403 }
      );
    }

    await prisma.calendarEvent.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "Failed to delete event:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
