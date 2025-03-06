import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { newDate } from "@/lib/date-utils";
import { getToken } from "next-auth/jwt";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "events-route";

// List all calendar events
export async function GET(request: NextRequest) {
  try {
    // Get the user token from the request
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If there's no token, return unauthorized
    if (!token) {
      logger.warn("Unauthorized access attempt to events API", {}, LOG_SOURCE);
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = token.sub;

    logger.debug("Fetching events from database...", {}, LOG_SOURCE);

    // Get events from feeds that belong to the current user
    const events = await prisma.calendarEvent.findMany({
      where: {
        feed: {
          userId,
        },
      },
      include: {
        feed: {
          select: {
            name: true,
            color: true,
          },
        },
      },
    });

    logger.debug(`Found ${events.length} events in database`, {}, LOG_SOURCE);
    return NextResponse.json(events);
  } catch (error) {
    logger.error(
      "Failed to fetch events:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

// Create a new event
export async function POST(request: NextRequest) {
  try {
    // Get the user token from the request
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If there's no token, return unauthorized
    if (!token) {
      logger.warn(
        "Unauthorized access attempt to create event",
        {},
        LOG_SOURCE
      );
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = token.sub;

    const {
      feedId,
      title,
      description,
      start,
      end,
      location,
      isRecurring,
      recurrenceRule,
      allDay,
    } = await request.json();

    if (!feedId || !title || !start || !end) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        {
          error:
            "Calendar feed not found or you don't have permission to access it",
        },
        { status: 404 }
      );
    }

    // Create event in database
    const event = await prisma.calendarEvent.create({
      data: {
        feedId,
        title,
        description,
        start: newDate(start),
        end: newDate(end),
        location,
        isRecurring: isRecurring || false,
        recurrenceRule,
        allDay: allDay || false,
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    logger.error(
      "Failed to create calendar event:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to create calendar event" },
      { status: 500 }
    );
  }
}

// Update an event
export async function PATCH(request: NextRequest) {
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

    const {
      id,
      title,
      description,
      start,
      end,
      location,
      isRecurring,
      recurrenceRule,
      allDay,
    } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    // Check if the event belongs to a feed owned by the current user
    const existingEvent = await prisma.calendarEvent.findUnique({
      where: { id },
      include: {
        feed: true,
      },
    });

    if (!existingEvent || existingEvent.feed.userId !== userId) {
      return NextResponse.json(
        { error: "Event not found or you don't have permission to update it" },
        { status: 404 }
      );
    }

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: {
        title,
        description,
        start: start ? newDate(start) : undefined,
        end: end ? newDate(end) : undefined,
        location,
        isRecurring,
        recurrenceRule,
        allDay,
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    logger.error(
      "Failed to update calendar event:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to update calendar event" },
      { status: 500 }
    );
  }
}

// Delete an event
export async function DELETE(request: NextRequest) {
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

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    // Check if the event belongs to a feed owned by the current user
    const existingEvent = await prisma.calendarEvent.findUnique({
      where: { id },
      include: {
        feed: true,
      },
    });

    if (!existingEvent || existingEvent.feed.userId !== userId) {
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
      "Failed to delete calendar event:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to delete calendar event" },
      { status: 500 }
    );
  }
}
