import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOutlookCalendarClient } from "@/lib/outlook-calendar";
import { syncOutlookCalendar } from "@/lib/outlook-sync";
import { logger } from "@/lib/logger";

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST to sync calendars." },
    { status: 405 }
  );
}

// Shared sync function


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
    //   select: { id: true, externalEventId: true },
    // });
    // const existingEventMap = new Map(
    //   existingEvents.map((e) => [e.externalEventId, e.id])
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
      feed.syncToken,
      true
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
    // for (const [externalEventId, id] of existingEventMap.entries()) {
    //   if (externalEventId && !processedEventIds.has(externalEventId)) {
    //     try {
    //       await prisma.calendarEvent.delete({
    //         where: { id },
    //       });
    //       deletedCount++;
    //     } catch (deleteError) {
    //       logger.log("Failed to delete event", {
    //         eventId: externalEventId,
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
      processedEvents: processedEventIds.size,
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
