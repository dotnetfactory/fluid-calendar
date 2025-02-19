import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createGoogleEvent,
  updateGoogleEvent,
  deleteGoogleEvent,
  getGoogleEvent,
} from "@/lib/google-calendar";
import { GaxiosError } from "gaxios";
import { calendar_v3 } from "googleapis";
import { CalendarEvent } from "@prisma/client";

type GoogleEvent = calendar_v3.Schema$Event;

// Helper function to write event to database
async function writeEventToDatabase(
  feedId: string,
  event: GoogleEvent,
  instances?: GoogleEvent[]
) {
  const isRecurring = !!event.recurrence;
  if (!isRecurring) {
    // Create the master event only if not recurring
    const masterEvent = await prisma.calendarEvent.create({
      data: {
        feedId,
        externalEventId: event.id,
        title: event.summary || "Untitled Event",
        description: event.description || "",
        start: new Date(event.start?.dateTime || event.start?.date || ""),
        end: new Date(event.end?.dateTime || event.end?.date || ""),
        location: event.location,
        isRecurring: isRecurring,
        recurrenceRule: event.recurrence?.[0],
        allDay: !event.start?.dateTime,
        status: event.status,
        sequence: event.sequence,
        created: event.created ? new Date(event.created) : undefined,
        lastModified: event.updated ? new Date(event.updated) : undefined,
        organizer: event.organizer
          ? {
              name: event.organizer.displayName,
              email: event.organizer.email,
            }
          : undefined,
        attendees: event.attendees?.map((a) => ({
          name: a.displayName,
          email: a.email,
          status: a.responseStatus,
        })),
      },
    });
    return masterEvent;
  }

  // Create instances if any
  const createdInstances = [];
  if (instances) {
    for (const instance of instances) {
      const createdInstance = await prisma.calendarEvent.create({
        data: {
          feedId,
          externalEventId: instance.id,
          title: instance.summary || "Untitled Event",
          description: instance.description || "",
          start: new Date(
            instance.start?.dateTime || instance.start?.date || ""
          ),
          end: new Date(instance.end?.dateTime || instance.end?.date || ""),
          location: instance.location,
          isRecurring: true,
          recurrenceRule: event.recurrence?.[0],
          recurringEventId: instance.recurringEventId,
          status: instance.status,
          sequence: instance.sequence,
          created: instance.created ? new Date(instance.created) : undefined,
          lastModified: instance.updated
            ? new Date(instance.updated)
            : undefined,
          organizer: instance.organizer
            ? {
                name: instance.organizer.displayName,
                email: instance.organizer.email,
              }
            : undefined,
          attendees: instance.attendees?.map((a) => ({
            name: a.displayName,
            email: a.email,
            status: a.responseStatus,
          })),
        },
      });
      createdInstances.push(createdInstance);
    }
  }

  return createdInstances;
}

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

    if (!feed || feed.type !== "GOOGLE" || !feed.url || !feed.accountId) {
      return NextResponse.json(
        { error: "Invalid calendar feed" },
        { status: 400 }
      );
    }

    // Create event in Google Calendar
    const googleEvent = await createGoogleEvent(feed.accountId, feed.url, {
      title: eventData.title,
      description: eventData.description,
      location: eventData.location,
      start: new Date(eventData.start),
      end: new Date(eventData.end),
      allDay: eventData.allDay,
      isRecurring: eventData.isRecurring,
      recurrenceRule: eventData.recurrenceRule,
    });

    if (!googleEvent.id) {
      throw new Error("Failed to get event ID from Google Calendar");
    }

    // Sync the new event to our database
    const { event, instances } = await getGoogleEvent(
      feed.accountId,
      feed.url,
      googleEvent.id
    );

    // Create the event record(s) in our database
    const records = await writeEventToDatabase(feed.id, event, instances);

    return NextResponse.json(records);
  } catch (error) {
    console.error("Failed to create Google calendar event:", error);
    if (error instanceof GaxiosError && Number(error.code) === 401) {
      return NextResponse.json(
        { error: "Authentication failed. Please try signing in again." },
        { status: 401 }
      );
    }
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

    console.log("event:", event);

    if (!event || !event.feed || !event.feed.url || !event.feed.accountId) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.feed.type !== "GOOGLE") {
      return NextResponse.json(
        { error: "Not a Google Calendar event" },
        { status: 400 }
      );
    }

    if (!event.externalEventId) {
      return NextResponse.json(
        { error: "No Google Calendar event ID found" },
        { status: 400 }
      );
    }

    // Update in Google Calendar
    const googleEvent = await updateGoogleEvent(
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

    if (!googleEvent.id) {
      throw new Error("Failed to get event ID from Google Calendar");
    }

    // Delete existing event and any related instances from our database
    deleteEvent(event);

    // Get the updated event and its instances
    const { event: updatedEvent, instances } = await getGoogleEvent(
      event.feed.accountId,
      event.feed.url,
      googleEvent.id
    );

    // Create new records in our database
    const records = await writeEventToDatabase(
      event.feed.id,
      updatedEvent,
      instances
    );

    return NextResponse.json(records);
  } catch (error) {
    console.error("Failed to update Google calendar event:", error);
    if (error instanceof GaxiosError && Number(error.code) === 401) {
      return NextResponse.json(
        { error: "Authentication failed. Please try signing in again." },
        { status: 401 }
      );
    }
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

    if (event.feed.type !== "GOOGLE") {
      return NextResponse.json(
        { error: "Not a Google Calendar event" },
        { status: 400 }
      );
    }

    if (!event.externalEventId) {
      return NextResponse.json(
        { error: "No Google Calendar event ID found" },
        { status: 400 }
      );
    }

    // Delete from Google Calendar
    await deleteGoogleEvent(
      event.feed.accountId,
      event.feed.url,
      event.externalEventId,
      mode
    );

    // Delete the event and any related instances from our database
    await deleteEvent(event);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete Google calendar event:", error);
    if (error instanceof GaxiosError && Number(error.code) === 401) {
      return NextResponse.json(
        { error: "Authentication failed. Please try signing in again." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}

async function deleteEvent(event: CalendarEvent) {
  if (!event.recurringEventId) {
    console.log("deleting single event", event.externalEventId);
    await prisma.calendarEvent.deleteMany({
      where: {
        externalEventId: event.externalEventId,
      },
    });
  } else {
    console.log("deleting recurring event", event.recurringEventId);
    await prisma.calendarEvent.deleteMany({
      where: {
        OR: [
          { externalEventId: event.externalEventId },
          { recurringEventId: event.recurringEventId },
        ],
      },
    });
  }
}
