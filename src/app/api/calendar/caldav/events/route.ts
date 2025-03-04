import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CalDAVCalendarService } from "@/lib/caldav-calendar";
import { logger } from "@/lib/logger";
import { newDate } from "@/lib/date-utils";
import { getEvent, validateEvent } from "@/lib/calendar-db";

const LOG_SOURCE = "CalDAVEventsAPI";

// Create a new event
export async function POST(request: Request) {
  try {
    const { feedId, ...eventData } = await request.json();

    logger.info(
      "Creating new CalDAV event",
      {
        feedId,
        title: eventData.title,
        start: new Date(eventData.start).toISOString(),
      },
      LOG_SOURCE
    );

    const feed = await prisma.calendarFeed.findUnique({
      where: { id: feedId },
      include: {
        account: true,
      },
    });

    if (!feed || feed.type !== "CALDAV" || !feed.accountId) {
      logger.error(
        "Invalid calendar feed for CalDAV event creation",
        { feedId },
        LOG_SOURCE
      );
      return NextResponse.json(
        { error: "Invalid calendar feed" },
        { status: 400 }
      );
    }

    // Get the calendar URL (path)
    const calendarPath = feed.url;
    if (!calendarPath) {
      logger.error(
        "Missing calendar path for CalDAV event creation",
        { feedId },
        LOG_SOURCE
      );
      return NextResponse.json(
        { error: "Missing calendar path" },
        { status: 400 }
      );
    }

    // Check if account exists
    if (!feed.account) {
      logger.error(
        "Missing account for CalDAV event creation",
        { feedId },
        LOG_SOURCE
      );
      return NextResponse.json({ error: "Missing account" }, { status: 400 });
    }

    // Create CalDAV service
    const caldavService = new CalDAVCalendarService(prisma, feed.account);

    // Create event in CalDAV calendar
    const createdEvent = await caldavService.createEvent(calendarPath, {
      title: eventData.title,
      description: eventData.description,
      location: eventData.location,
      start: newDate(eventData.start),
      end: newDate(eventData.end),
      allDay: eventData.allDay,
      isRecurring: eventData.isRecurring,
      recurrenceRule: eventData.recurrenceRule,
    });

    logger.info(
      "Successfully created CalDAV event",
      {
        eventId: createdEvent.id,
        feedId,
      },
      LOG_SOURCE
    );

    return NextResponse.json(createdEvent);
  } catch (error) {
    logger.error(
      "Failed to create CalDAV event",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack || null : null,
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      {
        error: "Failed to create event",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Update an existing event
export async function PUT(request: Request) {
  try {
    const { eventId, mode, ...updates } = await request.json();

    logger.info(
      "Updating CalDAV event",
      {
        eventId,
        mode,
        updates: JSON.stringify(updates),
      },
      LOG_SOURCE
    );

    // Get the event from the database
    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    const validatedEvent = await validateEvent(event, "CALDAV");

    if (validatedEvent instanceof NextResponse) {
      return validatedEvent;
    }

    // Get the calendar path
    const calendarPath =
      validatedEvent.feed.url || validatedEvent.feed.caldavPath;
    if (!calendarPath) {
      return NextResponse.json(
        { error: "No CalDAV calendar path found" },
        { status: 400 }
      );
    }

    // Get the account
    const account = await prisma.connectedAccount.findUnique({
      where: { id: validatedEvent.feed.accountId },
    });

    if (!account) {
      logger.error(
        "Account not found for CalDAV event update",
        { eventId },
        LOG_SOURCE
      );
      return NextResponse.json({ error: "Account not found" }, { status: 400 });
    }

    // Create CalDAV service
    const caldavService = new CalDAVCalendarService(prisma, account);

    // Update the event in CalDAV
    const updatedEvent = await caldavService.updateEvent(
      event,
      calendarPath,
      validatedEvent.externalEventId,
      {
        title: updates.title || validatedEvent.title,
        description: updates.description ?? validatedEvent.description,
        location: updates.location ?? validatedEvent.location,
        start: updates.start ? newDate(updates.start) : validatedEvent.start,
        end: updates.end ? newDate(updates.end) : validatedEvent.end,
        allDay: updates.allDay ?? validatedEvent.allDay,
        isRecurring: updates.isRecurring ?? validatedEvent.isRecurring,
        recurrenceRule: updates.recurrenceRule ?? validatedEvent.recurrenceRule,
      },
      "series" //todo: implement editing a single instance correctly.
    );

    logger.info(
      "Successfully updated CalDAV event",
      {
        eventId,
      },
      LOG_SOURCE
    );

    return NextResponse.json(updatedEvent);
  } catch (error) {
    logger.error(
      "Failed to update CalDAV event",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack || null : null,
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      {
        error: "Failed to update event",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Delete an event
export async function DELETE(request: Request) {
  try {
    const { eventId, mode } = await request.json();

    logger.info(
      "Deleting CalDAV event",
      {
        eventId,
        mode,
      },
      LOG_SOURCE
    );

    // Get the event from the database
    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    const validatedEvent = await validateEvent(event, "CALDAV");

    if (validatedEvent instanceof NextResponse) {
      return validatedEvent;
    }

    // Get the calendar path
    const calendarPath =
      validatedEvent.feed.url || validatedEvent.feed.caldavPath;
    if (!calendarPath) {
      return NextResponse.json(
        { error: "No CalDAV calendar path found" },
        { status: 400 }
      );
    }

    // Get the account
    const account = await prisma.connectedAccount.findUnique({
      where: { id: validatedEvent.feed.accountId },
    });

    if (!account) {
      logger.error(
        "Account not found for CalDAV event deletion",
        { eventId },
        LOG_SOURCE
      );
      return NextResponse.json({ error: "Account not found" }, { status: 400 });
    }

    // Create CalDAV service
    const caldavService = new CalDAVCalendarService(prisma, account);

    // Delete the event from CalDAV
    await caldavService.deleteEvent(
      event,
      calendarPath,
      validatedEvent.externalEventId,
      mode || "single"
    );

    logger.info(
      "Successfully deleted CalDAV event",
      {
        eventId,
      },
      LOG_SOURCE
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "Failed to delete CalDAV event",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack || null : null,
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      {
        error: "Failed to delete event",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
