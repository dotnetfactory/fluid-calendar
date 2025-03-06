import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOutlookClient } from "@/lib/outlook-calendar";
import { syncOutlookCalendar } from "@/lib/outlook-sync";
import { logger } from "@/lib/logger";
import { newDate } from "@/lib/date-utils";
import { getToken } from "next-auth/jwt";

const LOG_SOURCE = "OutlookCalendarSyncAPI";

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST to sync calendars." },
    { status: 405 }
  );
}

// Shared sync function

export async function POST(req: NextRequest) {
  try {
    // Get the user token from the request
    const token = await getToken({
      req: req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If there's no token, return unauthorized
    if (!token) {
      logger.warn(
        "Unauthorized access attempt to Outlook sync API",
        {},
        LOG_SOURCE
      );
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = token.sub;

    const body = await req.json();
    const { accountId, calendarId, name, color } = body;

    if (!accountId || !calendarId) {
      return NextResponse.json(
        { error: "Account ID and Calendar ID are required" },
        { status: 400 }
      );
    }

    // Get the account and ensure it belongs to the current user
    const account = await prisma.connectedAccount.findUnique({
      where: {
        id: accountId,
        userId,
      },
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
    const client = await getOutlookClient(accountId);
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
    logger.error(
      "Failed to add Outlook calendar",
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

export async function PUT(req: NextRequest) {
  try {
    // Get the user token from the request
    const token = await getToken({
      req: req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If there's no token, return unauthorized
    if (!token) {
      logger.warn(
        "Unauthorized access attempt to Outlook sync API",
        {},
        LOG_SOURCE
      );
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = token.sub;

    const body = await req.json();
    const { feedId } = body;

    if (!feedId) {
      return NextResponse.json(
        { error: "Feed ID is required" },
        { status: 400 }
      );
    }

    // Get the feed and ensure it belongs to the current user
    const feed = await prisma.calendarFeed.findUnique({
      where: {
        id: feedId,
        userId,
      },
      include: { account: true },
    });

    if (!feed || !feed.account) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    logger.error(
      "Starting Outlook calendar sync",
      {
        feedId: String(feedId),
        timestamp: new Date().toISOString(),
      },
      LOG_SOURCE
    );

    // Get events from Outlook
    const client = await getOutlookClient(feed.account.id);
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

    // Update the feed's sync status
    await prisma.calendarFeed.update({
      where: { id: feed.id },
      data: {
        lastSync: newDate(),
      },
    });

    logger.debug(
      "Completed Outlook calendar sync",
      {
        feedId: String(feedId),
        processedEvents: String(processedEventIds.size),
      },
      LOG_SOURCE
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "Failed to sync Outlook calendar",
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
