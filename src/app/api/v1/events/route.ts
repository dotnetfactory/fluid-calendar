import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ApiHttpError, v1Write, v1Read, V1Context } from "@/lib/api/v1";
import { paginated } from "@/lib/api/respond";

const LOG_SOURCE = "v1-events-route";

/**
 * POST /api/v1/events — create event(s)
 *
 * Auto-resolves the user's writable LOCAL feed (creating if needed).
 * Accepts a single event object OR array of events (batch cap: 100).
 * Validates: title, start, end required; end > start.
 *
 * Response: single object for single input, array for array. status 201.
 */
export async function POST(request: NextRequest) {
  return v1Write(request, "POST /api/v1/events", createEvents);
}

async function createEvents({ userId, request }: V1Context) {
  const body = await request.json();

  // Accept single or array
  const isArray = Array.isArray(body);
  const events = isArray ? body : [body];

  if (!Array.isArray(events) || events.length === 0) {
    throw new ApiHttpError(
      "INVALID_ARGUMENT",
      "Request body must be an event object or a non-empty array of events"
    );
  }

  if (events.length > 100) {
    throw new ApiHttpError(
      "INVALID_ARGUMENT",
      "Batch size exceeds maximum of 100 events"
    );
  }

  // Validate all events first (before any database writes)
  for (const event of events) {
    validateEventInput(event);
  }

  // Auto-resolve LOCAL feed: find existing or create new
  let feed = await prisma.calendarFeed.findFirst({
    where: {
      userId,
      type: "LOCAL",
    },
  });

  if (!feed) {
    // Create LOCAL feed if none exists
    feed = await prisma.calendarFeed.create({
      data: {
        name: "Local Calendar",
        type: "LOCAL",
        userId,
        enabled: true,
      },
    });
  }

  // Create events
  const createdEvents = await Promise.all(
    events.map((evt) =>
      prisma.calendarEvent.create({
        data: {
          feedId: feed!.id,
          title: evt.title,
          description: evt.description,
          start: new Date(evt.start),
          end: new Date(evt.end),
          location: evt.location,
          isRecurring: evt.isRecurring ?? false,
          recurrenceRule: evt.recurrenceRule,
          allDay: evt.allDay ?? false,
        },
      })
    )
  );

  logger.info(
    `Created ${createdEvents.length} event(s) for user ${userId}`,
    { feedId: feed.id, eventCount: createdEvents.length },
    LOG_SOURCE
  );

  return {
    status: 201,
    body: isArray ? createdEvents : createdEvents[0],
  };
}

function validateEventInput(event: unknown) {
  if (!event || typeof event !== "object") {
    throw new ApiHttpError(
      "INVALID_ARGUMENT",
      "Each event must be an object"
    );
  }

  const e = event as Record<string, unknown>;

  if (!e.title) {
    throw new ApiHttpError(
      "INVALID_ARGUMENT",
      "title is required",
      { field: "title" }
    );
  }

  if (!e.start) {
    throw new ApiHttpError(
      "INVALID_ARGUMENT",
      "start is required",
      { field: "start" }
    );
  }

  if (!e.end) {
    throw new ApiHttpError(
      "INVALID_ARGUMENT",
      "end is required",
      { field: "end" }
    );
  }

  const startTime = new Date(String(e.start)).getTime();
  const endTime = new Date(String(e.end)).getTime();

  if (isNaN(startTime)) {
    throw new ApiHttpError(
      "INVALID_ARGUMENT",
      "start must be a valid ISO date",
      { field: "start" }
    );
  }

  if (isNaN(endTime)) {
    throw new ApiHttpError(
      "INVALID_ARGUMENT",
      "end must be a valid ISO date",
      { field: "end" }
    );
  }

  if (endTime <= startTime) {
    throw new ApiHttpError(
      "INVALID_ARGUMENT",
      "end must be after start",
      { field: "end" }
    );
  }
}

/**
 * GET /api/v1/events — list events by date range
 *
 * Query params:
 *   - from: ISO date (inclusive)
 *   - to: ISO date (inclusive)
 *   - cursor: opaque cursor for pagination
 *   - limit: page size (default 50, max 500)
 *
 * Returns paginated shape: { data, next_cursor, has_more }
 * Sorted by start, then id (stable pagination).
 */
export async function GET(request: NextRequest) {
  return v1Read(request, listEvents);
}

async function listEvents({ userId, request }: V1Context) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const cursor = url.searchParams.get("cursor");
  const limitStr = url.searchParams.get("limit") ?? "50";

  const limit = Math.min(parseInt(limitStr, 10) || 50, 500);
  if (limit < 1) {
    throw new ApiHttpError(
      "INVALID_ARGUMENT",
      "limit must be at least 1",
      { field: "limit" }
    );
  }

  // Parse and validate date range
  let fromDate: Date | null = null;
  let toDate: Date | null = null;

  if (from) {
    fromDate = new Date(from);
    if (isNaN(fromDate.getTime())) {
      throw new ApiHttpError(
        "INVALID_ARGUMENT",
        "from must be a valid ISO date",
        { field: "from" }
      );
    }
  }

  if (to) {
    toDate = new Date(to);
    if (isNaN(toDate.getTime())) {
      throw new ApiHttpError(
        "INVALID_ARGUMENT",
        "to must be a valid ISO date",
        { field: "to" }
      );
    }
  }

  // Bound every query to a fixed window so no request can scan full history:
  // up to 2 years ahead and 1 week back (a generous, timezone-offset-safe
  // buffer). Applied even when from/to are omitted; a wider request is clamped.
  const nowMs = Date.now();
  const minStart = new Date(nowMs - 7 * 24 * 60 * 60 * 1000);
  const maxStart = new Date(nowMs + 2 * 365 * 24 * 60 * 60 * 1000);

  const rangeStart = fromDate && fromDate > minStart ? fromDate : minStart;
  let rangeEnd: Date;
  if (toDate) {
    rangeEnd = new Date(toDate);
    rangeEnd.setUTCHours(23, 59, 59, 999); // inclusive end-of-day
    if (rangeEnd > maxStart) rangeEnd = maxStart;
  } else {
    rangeEnd = maxStart;
  }

  // Decode cursor: format is "{start.toISOString()}|{id}"
  let cursorStart: Date | null = null;
  let cursorId: string | null = null;

  if (cursor) {
    const parts = cursor.split("|");
    if (parts.length === 2) {
      const cursorDate = new Date(parts[0]);
      if (!isNaN(cursorDate.getTime())) {
        cursorStart = cursorDate;
        cursorId = parts[1];
      }
    }
  }

  // Build where clause: events owned by this user, filtered by date range
  const where: Prisma.CalendarEventWhereInput = {
    feed: {
      userId,
    },
  };

  where.start = { gte: rangeStart, lte: rangeEnd };

  // For cursor-based pagination: fetch limit+1 to determine has_more
  // Apply cursor filtering in the WHERE clause
  if (cursorStart && cursorId) {
    where.OR = [
      { start: { gt: cursorStart } },
      {
        AND: [
          { start: { equals: cursorStart } },
          { id: { gt: cursorId } },
        ],
      },
    ];
  }

  const pageSize = limit + 1;

  const events = await prisma.calendarEvent.findMany({
    where,
    orderBy: [{ start: "asc" }, { id: "asc" }],
    take: pageSize,
  });

  const hasMore = events.length > limit;
  const result = events.slice(0, limit);

  let nextCursor: string | null = null;
  if (hasMore && result.length > 0) {
    const lastEvent = result[result.length - 1];
    nextCursor = `${lastEvent.start.toISOString()}|${lastEvent.id}`;
  }

  logger.debug(
    `Listed ${result.length} events for user ${userId}`,
    { from: from || null, to: to || null, limit },
    LOG_SOURCE
  );

  return {
    status: 200,
    body: paginated(result, nextCursor),
  };
}
