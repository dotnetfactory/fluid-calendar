import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import getGoogleEvent, {
  createGoogleEvent,
  updateGoogleEvent,
  deleteGoogleEvent,
} from "@/lib/google-calendar";
import { GaxiosError } from "gaxios";
import { calendar_v3 } from "googleapis";
import {
  deleteCalendarEvent,
  getEvent,
  validateEvent,
} from "@/lib/calendar-db";
import { newDate, createAllDayDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { authenticateRequest } from "@/lib/auth/api-auth";

const LOG_SOURCE = "GoogleEventsAPI";

type GoogleEvent = calendar_v3.Schema$Event;

// Helper function to write event to database
async function writeEventToDatabase(
  feedId: string,
  event: GoogleEvent,
  instances?: GoogleEvent[]
) {
  const isRecurring = !!event.recurrence;
  const isAllDay = event.start ? !event.start.dateTime : false;

  if (!isRecurring) {
    // Create the master event only if not recurring
    const masterEvent = await prisma.calendarEvent.create({
      data: {
        feedId,
        externalEventId: event.id,
        title: event.summary || "Untitled Event",
        description: event.description || "",
        start: isAllDay
          ? createAllDayDate(event.start?.date || "")
          : newDate(event.start?.dateTime || event.start?.date || ""),
        end: isAllDay
          ? createAllDayDate(event.end?.date || "")
          : newDate(event.end?.dateTime || event.end?.date || ""),
        location: event.location,
        isRecurring: isRecurring,
        recurrenceRule: event.recurrence?.[0],
        allDay: isAllDay,
        status: event.status,
        sequence: event.sequence,
        created: event.created ? newDate(event.created) : undefined,
        lastModified: event.updated ? newDate(event.updated) : undefined,
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
      const instanceIsAllDay = instance.start
        ? !instance.start.dateTime
        : false;

      const createdInstance = await prisma.calendarEvent.create({
        data: {
          feedId,
          externalEventId: instance.id,
          title: instance.summary || "Untitled Event",
          description: instance.description || "",
          start: instanceIsAllDay
            ? createAllDayDate(instance.start?.date || "")
            : newDate(instance.start?.dateTime || instance.start?.date || ""),
          end: instanceIsAllDay
            ? createAllDayDate(instance.end?.date || "")
            : newDate(instance.end?.dateTime || instance.end?.date || ""),
          location: instance.location,
          isRecurring: true,
          recurrenceRule: event.recurrence?.[0],
          recurringEventId: instance.recurringEventId,
          allDay: instanceIsAllDay,
          status: instance.status,
          sequence: instance.sequence,
          created: instance.created ? newDate(instance.created) : undefined,
          lastModified: instance.updated
            ? newDate(instance.updated)
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

    if (!feed || feed.type !== "GOOGLE" || !feed.url || !feed.accountId) {
      return NextResponse.json(
        { error: "Invalid calendar feed" },
        { status: 400 }
      );
    }

    // Create event in Google Calendar
    const googleEvent = await createGoogleEvent(
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

    if (!googleEvent.id) {
      throw new Error("Failed to get event ID from Google Calendar");
    }

    // Sync the new event to our database
    const { event, instances } = await getGoogleEvent(
      feed.accountId,
      userId,
      feed.url,
      googleEvent.id
    );

    // Create the event record(s) in our database
    const records = await writeEventToDatabase(feed.id, event, instances);

    return NextResponse.json(records);
  } catch (error) {
    logger.error(
      "Failed to create Google calendar event:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
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

    const validatedEvent = await validateEvent(event, "GOOGLE");

    if (validatedEvent instanceof NextResponse) {
      return validatedEvent;
    }

    // Update in Google Calendar
    const googleEvent = await updateGoogleEvent(
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

    if (!googleEvent.id) {
      throw new Error("Failed to get event ID from Google Calendar");
    }

    // Delete existing event and any related instances from our database
    deleteCalendarEvent(validatedEvent.id, mode);

    // Get the updated event and its instances
    const { event: updatedEvent, instances } = await getGoogleEvent(
      validatedEvent.feed.accountId,
      userId,
      validatedEvent.feed.url,
      googleEvent.id
    );

    // Create new records in our database
    const records = await writeEventToDatabase(
      validatedEvent.feed.id,
      updatedEvent,
      instances
    );

    return NextResponse.json(records);
  } catch (error) {
    logger.error(
      "Failed to update Google calendar event:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
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

    const validatedEvent = await validateEvent(event, "GOOGLE");

    if (validatedEvent instanceof NextResponse) {
      return validatedEvent;
    }

    // Delete from Google Calendar
    await deleteGoogleEvent(
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
      "Failed to delete Google calendar event:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
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
