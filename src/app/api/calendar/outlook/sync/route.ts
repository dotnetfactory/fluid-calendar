import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOutlookCalendarClient } from "@/lib/outlook-calendar";
import {
  fetchAllEvents,
  processMasterEvent,
  createBaseEventData,
  saveEventToDatabase,
} from "@/lib/outlook-sync";
import { logger } from "@/lib/logger";
import { Client } from "@microsoft/microsoft-graph-client";

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST to sync calendars." },
    { status: 405 }
  );
}

// Shared sync function
async function syncOutlookCalendar(
  client: Client,
  feed: { id: string; url: string },
  lastSyncToken?: string | null
) {
  // Fetch all events
  const {
    events: allEvents,
    deletedEventIds,
    nextSyncToken,
  } = await fetchAllEvents(client, feed.url, lastSyncToken);
  logger.log("Fetched events from Outlook", {
    totalCount: allEvents.length,
    deletedEventsCount: deletedEventIds?.length || 0,
    nextSyncToken: nextSyncToken ? "present" : "not present",
  });

  // Handle deleted events first if this is a delta sync
  if (lastSyncToken && deletedEventIds?.length > 0) {
    for (const eventId of deletedEventIds) {
      try {
        // Find and delete the event from our database
        const existingEvent = await prisma.calendarEvent.findFirst({
          where: {
            feedId: feed.id,
            googleEventId: eventId,
          },
        });
        if (existingEvent) {
          await prisma.calendarEvent.delete({
            where: { id: existingEvent.id },
          });
        }
      } catch (error) {
        logger.log("Failed to delete event", {
          eventId,
          error,
        });
      }
    }
  }

  // First, collect master events and non-recurring events
  const masterEvents = new Map();
  const nonRecurringEvents = [];

  for (const event of allEvents) {
    if (event.recurrence) {
      masterEvents.set(event.id, event);
    } else if (!event.seriesMasterId) {
      nonRecurringEvents.push(event);
    }
  }

  logger.log("Retrieved events from Outlook", {
    totalCount: allEvents.length,
    masterEventsCount: masterEvents.size,
    nonRecurringCount: nonRecurringEvents.length,
    deletedEventsCount: deletedEventIds?.length || 0,
    nextSyncToken: nextSyncToken ? "present" : "not present",
  });

  // Process each event
  const processedEventIds = new Set<string>();

  // First, process non-recurring events
  for (const event of nonRecurringEvents) {
    try {
      processedEventIds.add(event.id);

      const eventData = {
        ...createBaseEventData(event, feed.id, false, false),
        recurrenceRule: null,
        masterEventId: null,
        recurringEventId: null,
      };

      await saveEventToDatabase(eventData, feed.id, event.id);
    } catch (error) {
      logger.log("Failed to process non-recurring event", {
        eventId: event.id,
        subject: event.subject,
        error,
      });
    }
  }

  // Then, process recurring events
  for (const [, masterEvent] of masterEvents) {
    const processedIds = await processMasterEvent(client, masterEvent, feed);
    processedIds.forEach((id) => processedEventIds.add(id));
  }

  return { processedEventIds, nextSyncToken };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accountId, calendarId, name, color } = body;

    if (!accountId || !calendarId) {
      return NextResponse.json(
        { error: "Account ID and Calendar ID are required" },
        { status: 400 }
      );
    }

    // Get the account
    const account = await prisma.connectedAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.provider !== "OUTLOOK") {
      return NextResponse.json(
        { error: "Invalid Outlook account" },
        { status: 400 }
      );
    }

    // Check if calendar already exists
    const existingFeed = await prisma.calendarFeed.findFirst({
      where: {
        type: "OUTLOOK",
        url: calendarId,
        accountId,
      },
    });

    if (existingFeed) {
      return NextResponse.json(existingFeed);
    }

    // Create calendar feed
    const feed = await prisma.calendarFeed.create({
      data: {
        name,
        type: "OUTLOOK",
        url: calendarId,
        color: color || "#3b82f6",
        enabled: true,
        accountId: account.id,
      },
    });

    // Sync events for this calendar
    const client = await getOutlookCalendarClient(accountId);
    // Before syncing, check and cast the URL
    if (!feed.url) {
      return NextResponse.json(
        { error: "Calendar URL is required" },
        { status: 400 }
      );
    }
    await syncOutlookCalendar(
      client,
      { id: feed.id, url: feed.url as string },
      null
    );

    return NextResponse.json(feed);
  } catch (error) {
    logger.log("Failed to add Outlook calendar", { error });
    return NextResponse.json(
      { error: "Failed to add calendar" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { feedId } = body;

    logger.log("Starting Outlook calendar sync", { feedId });

    if (!feedId) {
      return NextResponse.json(
        { error: "Calendar feed ID is required" },
        { status: 400 }
      );
    }

    // Get the calendar feed and account
    const feed = await prisma.calendarFeed.findUnique({
      where: { id: feedId },
      include: { account: true },
    });

    if (!feed || !feed.account || feed.type !== "OUTLOOK") {
      logger.log("Invalid Outlook calendar", { feed });
      return NextResponse.json(
        { error: "Invalid Outlook calendar" },
        { status: 400 }
      );
    }

    // Get all existing event IDs for this feed
    // const existingEvents = await prisma.calendarEvent.findMany({
    //   where: { feedId },
    //   select: { id: true, googleEventId: true },
    // });
    // const existingEventMap = new Map(
    //   existingEvents.map((e) => [e.googleEventId, e.id])
    // );

    // Get events from Outlook
    const client = await getOutlookCalendarClient(feed.account.id);
    if (!feed.url) {
      return NextResponse.json(
        { error: "Calendar URL is required" },
        { status: 400 }
      );
    }
    const { processedEventIds, nextSyncToken } = await syncOutlookCalendar(
      client,
      { id: feed.id, url: feed.url as string },
      feed.syncToken
    );

    // Update the feed's sync token
    if (nextSyncToken) {
      await prisma.calendarFeed.update({
        where: { id: feed.id },
        data: {
          syncToken: nextSyncToken,
        },
      });
    }

    // // Delete events that no longer exist in Outlook
    // let deletedCount = 0;
    // for (const [googleEventId, id] of existingEventMap.entries()) {
    //   if (googleEventId && !processedEventIds.has(googleEventId)) {
    //     try {
    //       await prisma.calendarEvent.delete({
    //         where: { id },
    //       });
    //       deletedCount++;
    //     } catch (deleteError) {
    //       logger.log("Failed to delete event", {
    //         eventId: googleEventId,
    //         error: deleteError,
    //       });
    //     }
    //   }
    // }

    // Update the feed's sync status
    await prisma.calendarFeed.update({
      where: { id: feed.id },
      data: {
        lastSync: new Date(),
      },
    });

    logger.log("Completed Outlook calendar sync", {
      feedId,
      processedEvents: processedEventIds.size
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.log("Failed to sync Outlook calendar", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to sync calendar" },
      { status: 500 }
    );
  }
}
