import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { CalendarEvent, CalendarFeed } from "@prisma/client";

type EventWithFeed = CalendarEvent & {
  feed: CalendarFeed;
};

type ValidatedEvent = CalendarEvent & {
  feed: CalendarFeed & {
    accountId: string;
    url: string;
  };
  externalEventId: string;
};

export async function getEvent(eventId: string) {
  return prisma.calendarEvent.findUnique({
    where: { id: eventId },
    include: { feed: true },
  });
}

export async function validateEvent(
  event: EventWithFeed | null,
  provider: "GOOGLE" | "OUTLOOK" | "CALDAV"
): Promise<ValidatedEvent | NextResponse> {
  if (!event || !event.feed || !event.feed.accountId) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.feed.type !== provider) {
    return NextResponse.json(
      { error: `Not a ${provider} Calendar event` },
      { status: 400 }
    );
  }

  // For CalDAV, we need either a URL or a caldavPath
  if (provider === "CALDAV" && !event.feed.caldavPath && !event.feed.url) {
    return NextResponse.json(
      { error: "No CalDAV calendar path found" },
      { status: 400 }
    );
  } else if (provider !== "CALDAV" && !event.feed.url) {
    return NextResponse.json(
      { error: "No calendar URL found" },
      { status: 400 }
    );
  }

  if (!event.externalEventId) {
    return NextResponse.json(
      { error: `No ${provider} Calendar event ID found` },
      { status: 400 }
    );
  }

  return event as ValidatedEvent;
}

export async function deleteCalendarEvent(
  eventId: string,
  mode: "single" | "series" = "single"
) {
  const event = await getEvent(eventId);

  if (!event) {
    throw new Error("Event not found");
  }

  if (mode === "series") {
    // Delete the event and any related instances from our database
    if (event.isMaster || !event.masterEventId) {
      //deleting the master event will cascade to all instances
      await prisma.calendarEvent.delete({
        where: {
          id: event.id,
        },
      });
    } else {
      const masterEvent = await prisma.calendarEvent.findFirst({
        where: {
          id: event.masterEventId,
        },
      });
      //deleting the master event will cascade to all instances
      await prisma.calendarEvent.delete({
        where: {
          id: masterEvent?.id,
        },
      });
    }
  } else {
    //delete a single instance
    await prisma.calendarEvent.delete({
      where: {
        id: event.id,
      },
    });
  }

  return event;
}
