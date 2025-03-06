import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createOutlookEvent,
  updateOutlookEvent,
  deleteOutlookEvent,
} from "@/lib/outlook-calendar";
import { logger } from "@/lib/logger";
import { getOutlookClient } from "@/lib/outlook-calendar";
import { syncOutlookCalendar } from "@/lib/outlook-sync";
import {
  deleteCalendarEvent,
  getEvent,
  validateEvent,
} from "@/lib/calendar-db";
import { newDate } from "@/lib/date-utils";
import { authenticateRequest } from "@/lib/auth/api-auth";

const LOG_SOURCE = "OutlookCalendarEventsAPI";

// Helper function to write event to database

// Create a new event
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { feedId, ...eventData } = await request.json();

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

    if (!feed || feed.type !== "OUTLOOK" || !feed.url || !feed.accountId) {
      return NextResponse.json(
        { error: "Invalid calendar feed" },
        { status: 400 }
      );
    }

    // Create event in Outlook Calendar
    const outlookEvent = await createOutlookEvent(
      feed.accountId,
      userId,
      feed.url,
      {
        title: eventData.title,
        description: eventData.description,
        location: eventData.location,
        start: newDate(eventData.start),
        end: newDate(eventData.end),
        allDay: eventData.allDay,
        isRecurring: eventData.isRecurring,
        recurrenceRule: eventData.recurrenceRule,
      }
    );

    if (!outlookEvent.id) {
      throw new Error("Failed to get event ID from Outlook Calendar");
    }

    //todo this slows down the event creation significantly, we should just create the event in the database
    // Get the Outlook client and sync the calendar
    const client = await getOutlookClient(feed.accountId, userId);
    await syncOutlookCalendar(
      client,
      { id: feed.id, url: feed.url },
      feed.syncToken
    );

    // Get the created event from database
    const createdEvent = await prisma.calendarEvent.findFirst({
      where: {
        feedId: feed.id,
        externalEventId: outlookEvent.id,
      },
    });

    if (!createdEvent) {
      throw new Error("Failed to find created event after sync");
    }

    return NextResponse.json(createdEvent);
  } catch (error) {
    logger.error(
      "Failed to create Outlook calendar event:",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}

// Update an event
export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { eventId, mode, ...updates } = await request.json();
    if (!eventId) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    }

    const event = await getEvent(eventId);

    // Check if the event belongs to a feed owned by the current user
    if (event && event.feed.userId !== userId) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const validatedEvent = await validateEvent(event, "OUTLOOK");

    if (validatedEvent instanceof NextResponse) {
      return validatedEvent;
    }

    // Update in Outlook Calendar
    const outlookEvent = await updateOutlookEvent(
      validatedEvent.feed.accountId,
      userId,
      validatedEvent.feed.url,
      validatedEvent.externalEventId,
      {
        ...updates,
        mode,
        start: updates.start ? newDate(updates.start) : undefined,
        end: updates.end ? newDate(updates.end) : undefined,
      }
    );

    if (!outlookEvent.id) {
      throw new Error("Failed to get event ID from Outlook Calendar");
    }

    // Delete existing event and any related instances from our database
    await prisma.calendarEvent.deleteMany({
      where: {
        OR: [
          { id: validatedEvent.id },
          { recurringEventId: validatedEvent.externalEventId },
        ],
      },
    });

    // Get the updated event and its instances
    const client = await getOutlookClient(
      validatedEvent.feed.accountId,
      userId
    );
    await syncOutlookCalendar(
      client,
      { id: validatedEvent.feed.id, url: validatedEvent.feed.url },
      validatedEvent.feed.syncToken
    );

    const record = await prisma.calendarEvent.findFirst({
      where: {
        externalEventId: outlookEvent.id,
      },
    });
    return NextResponse.json(record);
  } catch (error) {
    logger.error(
      "Failed to update Outlook calendar event:",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

// Delete an event
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { eventId, mode } = await request.json();
    if (!eventId) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    }

    const event = await getEvent(eventId);

    // Check if the event belongs to a feed owned by the current user
    if (event && event.feed.userId !== userId) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const validatedEvent = await validateEvent(event, "OUTLOOK");

    if (validatedEvent instanceof NextResponse) {
      return validatedEvent;
    }

    // Delete from Outlook Calendar
    await deleteOutlookEvent(
      validatedEvent.feed.accountId,
      validatedEvent.feed.url,
      validatedEvent.externalEventId,
      mode
    );

    // Delete from database using shared function
    await deleteCalendarEvent(validatedEvent.id, mode);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "Failed to delete Outlook calendar event:",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
