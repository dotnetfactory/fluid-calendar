import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createOutlookEvent,
  updateOutlookEvent,
  deleteOutlookEvent,
} from "@/lib/outlook-calendar";
import { logger } from "@/lib/logger";
import { getOutlookCalendarClient } from "@/lib/outlook-calendar";
import { syncOutlookCalendar } from "@/lib/outlook-sync";

// Helper function to write event to database

// Create a new event
export async function POST(request: Request) {
  try {
    const { feedId, ...eventData } = await request.json();
    const feed = await prisma.calendarFeed.findUnique({
      where: { id: feedId },
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
    const outlookEvent = await createOutlookEvent(feed.accountId, feed.url, {
      title: eventData.title,
      description: eventData.description,
      location: eventData.location,
      start: new Date(eventData.start),
      end: new Date(eventData.end),
      allDay: eventData.allDay,
      isRecurring: eventData.isRecurring,
      recurrenceRule: eventData.recurrenceRule,
    });

    if (!outlookEvent.id) {
      throw new Error("Failed to get event ID from Outlook Calendar");
    }

    // Get the Outlook client and sync the calendar
    const client = await getOutlookCalendarClient(feed.accountId);
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
    logger.log("Failed to create Outlook calendar event:", { error });
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}

// Update an event
export async function PUT(request: Request) {
  try {
    const { eventId, mode, ...updates } = await request.json();
    if (!eventId) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    }

    const event = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
      include: { feed: true },
    });

    if (!event || !event.feed || !event.feed.url || !event.feed.accountId) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.feed.type !== "OUTLOOK") {
      return NextResponse.json(
        { error: "Not an Outlook Calendar event" },
        { status: 400 }
      );
    }

    if (!event.externalEventId) {
      return NextResponse.json(
        { error: "No Outlook Calendar event ID found" },
        { status: 400 }
      );
    }

    // Update in Outlook Calendar
    const outlookEvent = await updateOutlookEvent(
      event.feed.accountId,
      event.feed.url,
      event.externalEventId,
      {
        ...updates,
        mode,
        start: updates.start ? new Date(updates.start) : undefined,
        end: updates.end ? new Date(updates.end) : undefined,
      }
    );

    if (!outlookEvent.id) {
      throw new Error("Failed to get event ID from Outlook Calendar");
    }

    // Delete existing event and any related instances from our database
    await prisma.calendarEvent.deleteMany({
      where: {
        OR: [{ id: event.id }, { recurringEventId: event.externalEventId }],
      },
    });

    // Get the updated event and its instances
    const client = await getOutlookCalendarClient(event.feed.accountId);
    await syncOutlookCalendar(
      client,
      { id: event.feed.id, url: event.feed.url },
      event.feed.syncToken
    );

    const record = await prisma.calendarEvent.findFirst({
      where: {
        externalEventId: outlookEvent.id,
      },
    });
    return NextResponse.json(record);
  } catch (error) {
    logger.log("Failed to update Outlook calendar event:", { error });
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

// Delete an event
export async function DELETE(request: Request) {
  try {
    const { eventId, mode } = await request.json();
    if (!eventId) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    }

    const event = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
      include: { feed: true },
    });

    if (!event || !event.feed || !event.feed.url || !event.feed.accountId) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.feed.type !== "OUTLOOK") {
      return NextResponse.json(
        { error: "Not an Outlook Calendar event" },
        { status: 400 }
      );
    }

    if (!event.externalEventId) {
      return NextResponse.json(
        { error: "No Outlook Calendar event ID found" },
        { status: 400 }
      );
    }

    // Delete from Outlook Calendar
    await deleteOutlookEvent(
      event.feed.accountId,
      event.feed.url,
      event.externalEventId,
      mode
    );

    // Delete the event and any related instances from our database
    await prisma.calendarEvent.deleteMany({
      where: {
        OR: [{ id: event.id }, { recurringEventId: event.externalEventId }],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.log("Failed to delete Outlook calendar event:", { error });
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
