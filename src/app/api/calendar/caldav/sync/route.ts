import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { CalDAVCalendarService } from "@/lib/caldav-calendar";
import { newDate } from "@/lib/date-utils";

const LOG_SOURCE = "CalDAVCalendarSyncAPI";

/**
 * API route for syncing a CalDAV calendar
 * PUT /api/calendar/caldav/sync
 * Body: { feedId }
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { feedId } = body;

    logger.info(
      "Starting CalDAV calendar sync",
      {
        feedId: String(feedId),
        timestamp: new Date().toISOString(),
      },
      LOG_SOURCE
    );

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

    if (!feed || !feed.account || feed.type !== "CALDAV") {
      logger.error(
        "Invalid CalDAV calendar",
        {
          feed: JSON.stringify(feed),
          timestamp: new Date().toISOString(),
        },
        LOG_SOURCE
      );
      return NextResponse.json(
        { error: "Invalid CalDAV calendar" },
        { status: 400 }
      );
    }

    // Ensure we have the required CalDAV fields
    if (
      !feed.url ||
      !feed.account.caldavUsername ||
      !feed.account.accessToken
    ) {
      logger.error(
        "Missing required CalDAV fields",
        {
          hasUrl: !!feed.url,
          hasUsername: !!feed.account.caldavUsername,
          hasPassword: !!feed.account.accessToken,
        },
        LOG_SOURCE
      );
      return NextResponse.json(
        { error: "Missing required CalDAV fields" },
        { status: 400 }
      );
    }

    // Create CalDAV service
    const caldavService = new CalDAVCalendarService(prisma, feed.account);

    // Sync calendar
    try {
      //delete all events from the database
      await prisma.calendarEvent.deleteMany({
        where: {
          feedId: feed.id,
        },
      });
      await caldavService.syncCalendar(feed.url);
    } catch (syncError) {
      logger.error(
        "Failed to sync CalDAV calendar",
        {
          error:
            syncError instanceof Error ? syncError.message : String(syncError),
          feedId,
        },
        LOG_SOURCE
      );
      return NextResponse.json(
        {
          error: "Failed to sync CalDAV calendar",
          details:
            syncError instanceof Error ? syncError.message : String(syncError),
        },
        { status: 500 }
      );
    }

    // Update the feed's sync status
    await prisma.calendarFeed.update({
      where: { id: feed.id },
      data: {
        lastSync: newDate(),
      },
    });

    logger.info(
      "Completed CalDAV calendar sync",
      {
        feedId: String(feedId),
      },
      LOG_SOURCE
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "Failed to sync CalDAV calendar",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to sync calendar" },
      { status: 500 }
    );
  }
}

/**
 * API route for adding a CalDAV calendar and performing initial sync
 * POST /api/calendar/caldav/sync
 * Body: { accountId, calendarId, name, color }
 */
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

    if (!account || account.provider !== "CALDAV") {
      return NextResponse.json(
        { error: "Invalid CalDAV account" },
        { status: 400 }
      );
    }

    // Check if calendar already exists
    const existingFeed = await prisma.calendarFeed.findFirst({
      where: {
        type: "CALDAV",
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
        type: "CALDAV",
        url: calendarId,
        color: color || "#4285F4",
        enabled: true,
        accountId: account.id,
      },
    });

    // Sync events for this calendar
    const caldavService = new CalDAVCalendarService(prisma, account);

    try {
      await caldavService.syncCalendar(calendarId);
    } catch (syncError) {
      logger.error(
        "Failed to perform initial sync of CalDAV calendar",
        {
          error:
            syncError instanceof Error ? syncError.message : String(syncError),
          calendarId,
          accountId,
        },
        LOG_SOURCE
      );
      // Don't return an error here, as we've already created the feed
    }

    return NextResponse.json(feed);
  } catch (error) {
    logger.error(
      "Failed to add CalDAV calendar",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to add calendar" },
      { status: 500 }
    );
  }
}
