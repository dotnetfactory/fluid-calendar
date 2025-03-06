import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { newDate } from "@/lib/date-utils";
import { getToken } from "next-auth/jwt";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "FeedSyncAPI";

interface CalendarEventInput {
  start: string | Date;
  end: string | Date;
  created?: string | Date;
  lastModified?: string | Date;
  [key: string]: unknown;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the user token from the request
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If there's no token, return unauthorized
    if (!token) {
      logger.warn(
        "Unauthorized access attempt to feed sync API",
        {},
        LOG_SOURCE
      );
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = token.sub;

    const { events } = await request.json();
    const { id: feedId } = await params;

    // Verify the feed belongs to the current user
    const feed = await prisma.calendarFeed.findUnique({
      where: {
        id: feedId,
        userId,
      },
    });

    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    // Start a transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // Delete existing events for this feed
      await tx.calendarEvent.deleteMany({
        where: { feedId },
      });

      // Insert new events
      if (events && events.length > 0) {
        await tx.calendarEvent.createMany({
          data: events.map((event: CalendarEventInput) => ({
            ...event,
            feedId,
            // Convert Date objects to strings for database storage
            start: newDate(event.start).toISOString(),
            end: newDate(event.end).toISOString(),
            created: event.created
              ? newDate(event.created).toISOString()
              : undefined,
            lastModified: event.lastModified
              ? newDate(event.lastModified).toISOString()
              : undefined,
          })),
        });
      }

      // Update feed's lastSync timestamp
      await tx.calendarFeed.update({
        where: { id: feedId },
        data: { lastSync: newDate() },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "Failed to sync feed events:",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to sync feed events" },
      { status: 500 }
    );
  }
}
