import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEvent } from "@/lib/calendar-db";
import { getToken } from "next-auth/jwt";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "event-route";

// Get a specific event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the user token from the request
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If there's no token, return unauthorized
    if (!token) {
      logger.warn("Unauthorized access attempt to event API", {}, LOG_SOURCE);
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = token.sub;

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
    // Get the user token from the request
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If there's no token, return unauthorized
    if (!token) {
      logger.warn(
        "Unauthorized access attempt to update event",
        {},
        LOG_SOURCE
      );
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = token.sub;

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

    const updates = await request.json();
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
    // Get the user token from the request
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If there's no token, return unauthorized
    if (!token) {
      logger.warn(
        "Unauthorized access attempt to delete event",
        {},
        LOG_SOURCE
      );
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = token.sub;

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
