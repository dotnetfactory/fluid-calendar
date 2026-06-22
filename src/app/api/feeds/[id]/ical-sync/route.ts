import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { newDate } from "@/lib/date-utils";
import { expandIcalEvents, fetchIcalEvents } from "@/lib/ical-feed";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

// Window around "now" to materialize recurring occurrences at sync time.
const EXPAND_PAST_MS = 366 * 24 * 60 * 60 * 1000; // ~1 year back
const EXPAND_FUTURE_MS = 2 * 366 * 24 * 60 * 60 * 1000; // ~2 years ahead

const LOG_SOURCE = "ICalFeedSyncAPI";

//todo: add a scheduled background refresh for iCal feeds (SAAS BullMQ job)
// so subscriptions stay current without a manual sync. Open-source has no
// background scheduler today, so refresh is user-initiated for now.

/**
 * Syncs an iCal (ICS URL) feed: re-fetches the subscription URL, parses it, and
 * replaces the feed's stored events with the freshly parsed set.
 *
 * The fetch + parse happens BEFORE the transaction so that a fetch/parse
 * failure surfaces as an error WITHOUT deleting the feed's existing events.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;
    const { id: feedId } = await params;

    // Verify the feed belongs to the current user and is an iCal feed
    const feed = await prisma.calendarFeed.findUnique({
      where: { id: feedId, userId },
    });

    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    if (feed.type !== "ICAL") {
      return NextResponse.json(
        { error: "Not an iCal feed" },
        { status: 400 }
      );
    }

    if (!feed.url) {
      return NextResponse.json(
        { error: "iCal feed has no URL" },
        { status: 400 }
      );
    }

    // Fetch + parse first; on failure we leave existing events untouched.
    let events;
    try {
      const parsed = await fetchIcalEvents(feed.url);
      // Materialize recurring occurrences within a bounded window so they
      // render (the calendar render path does not expand masters).
      const now = newDate();
      events = expandIcalEvents(
        parsed,
        new Date(now.getTime() - EXPAND_PAST_MS),
        new Date(now.getTime() + EXPAND_FUTURE_MS)
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to sync iCal feed";
      logger.error(
        "Failed to fetch/parse iCal feed",
        { error: message, feedId },
        LOG_SOURCE
      );
      // Record the error on the feed without dropping previously synced events.
      await prisma.calendarFeed.update({
        where: { id: feedId, userId },
        data: { error: message },
      });
      return NextResponse.json({ error: message }, { status: 502 });
    }

    // Replace the feed's events with the freshly parsed set.
    await prisma.$transaction(async (tx) => {
      await tx.calendarEvent.deleteMany({ where: { feedId } });

      if (events.length > 0) {
        await tx.calendarEvent.createMany({
          data: events.map((event) => ({
            ...event,
            feedId,
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

      await tx.calendarFeed.update({
        where: { id: feedId, userId },
        data: { lastSync: newDate(), error: null },
      });
    });

    return NextResponse.json({ success: true, count: events.length });
  } catch (error) {
    logger.error(
      "Failed to sync iCal feed",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to sync iCal feed" },
      { status: 500 }
    );
  }
}
