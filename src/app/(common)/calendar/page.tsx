import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import { Calendar } from "@/components/calendar/Calendar";

import { prisma } from "@/lib/prisma";

import {
  AttendeeStatus,
  CalendarEvent,
  CalendarFeed,
  EventStatus,
} from "@/types/calendar";

export default async function HomePage() {
  const cookieHeader = await cookies();
  const req = new NextRequest(process.env.NEXTAUTH_URL as string, {
    headers: { cookie: cookieHeader.toString() },
  });
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });


  const userId = token?.sub;

  let feeds: CalendarFeed[] = [];
  let events: CalendarEvent[] = [];

  if (userId) {
    // Fetch calendar feeds
    const dbFeeds = await prisma.calendarFeed.findMany({
      where: {
        userId: userId,
      },
      include: {
        account: {
          select: {
            id: true,
            provider: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Transform to match expected types
    feeds = dbFeeds.map((feed) => ({
      id: feed.id,
      name: feed.name,
      url: feed.url || undefined,
      type: feed.type as "GOOGLE" | "OUTLOOK" | "CALDAV",
      color: feed.color || undefined,
      enabled: feed.enabled,
      createdAt: feed.createdAt,
      updatedAt: feed.updatedAt,
      lastSync: feed.lastSync || undefined,
      error: feed.error || undefined,
      syncToken: feed.syncToken || undefined,
      channelId: feed.channelId || undefined,
      resourceId: feed.resourceId || undefined,
      channelExpiration: feed.channelExpiration || undefined,
      userId: feed.userId || undefined,
      accountId: feed.accountId || undefined,
      caldavPath: feed.caldavPath || undefined,
      ctag: feed.ctag || undefined,
      account: feed.account,
    }));

    // Fetch calendar events
    const dbEvents = await prisma.calendarEvent.findMany({
      where: {
        feed: {
          userId: userId,
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

    // Transform to match expected types
    events = dbEvents.map((event) => ({
      id: event.id,
      feedId: event.feedId,
      externalEventId: event.externalEventId || undefined,
      title: event.title,
      description: event.description || undefined,
      start: event.start,
      end: event.end,
      location: event.location || undefined,
      isRecurring: event.isRecurring,
      recurrenceRule: event.recurrenceRule || undefined,
      allDay: event.allDay,
      status: event.status as EventStatus | undefined,
      sequence: event.sequence || undefined,
      created: event.created || undefined,
      lastModified: event.lastModified || undefined,
      organizer: event.organizer as
        | { name?: string; email: string }
        | undefined,
      attendees: event.attendees as
        | Array<{ name?: string; email: string; status?: AttendeeStatus }>
        | undefined,
      isMaster: event.isMaster,
      masterEventId: event.masterEventId || undefined,
      recurringEventId: event.recurringEventId || undefined,
      feed: event.feed,
    }));
  }

  return (
    <div className="absolute inset-0">
      <Calendar initialFeeds={feeds} initialEvents={events} />
    </div>
  );
}
