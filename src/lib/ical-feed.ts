import { CalendarEvent } from "@prisma/client";
import ICAL from "ical.js";

import { convertVEventToCalendarEvent } from "./caldav-helpers";
import { logger } from "./logger";

const LOG_SOURCE = "ICalFeed";

// Cap the ICS body we read from an arbitrary user-supplied URL to avoid pulling
// an unbounded response into memory (mild SSRF/abuse hardening).
const MAX_ICS_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Fields of a parsed iCal event that are safe to persist for a new feed event.
 *
 * The placeholder `id`/`feedId`/timestamps produced by
 * `convertVEventToCalendarEvent` are dropped so the database assigns them (and
 * `feedId` is set by the caller). The JSON columns `organizer`/`attendees` are
 * also dropped: the converter always emits them as `null`, and keeping them as
 * Prisma `JsonValue` (which includes `null`) is incompatible with `createMany`'s
 * `NullableJsonNullValueInput` typing. iCal subscriptions do not surface
 * organizer/attendee data today, so omitting them is lossless.
 */
export type ParsedIcalEvent = Omit<
  CalendarEvent,
  "id" | "feedId" | "createdAt" | "updatedAt" | "organizer" | "attendees"
>;

/**
 * Normalizes a user-supplied iCal subscription URL.
 *
 * - Trims surrounding whitespace.
 * - Rewrites `webcal://` / `webcals://` to `https://` (the de-facto convention
 *   for subscribe links).
 * - Accepts only `http`/`https` after normalization; anything else throws.
 *
 * @param url Raw URL entered by the user
 * @returns A fetchable `http(s)` URL
 */
export function normalizeIcalUrl(url: string): string {
  const trimmed = (url ?? "").trim();
  if (!trimmed) {
    throw new Error("iCal URL is required");
  }

  let normalized = trimmed;
  if (/^webcals:\/\//i.test(normalized)) {
    normalized = normalized.replace(/^webcals:\/\//i, "https://");
  } else if (/^webcal:\/\//i.test(normalized)) {
    normalized = normalized.replace(/^webcal:\/\//i, "https://");
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`Invalid iCal URL: ${trimmed}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `Unsupported iCal URL scheme: ${parsed.protocol} (only http/https/webcal are allowed)`
    );
  }

  return normalized;
}

/**
 * Parses an iCal/ICS document into calendar events.
 *
 * Reuses the CalDAV `convertVEventToCalendarEvent` helper so recurrence,
 * all-day detection, and duration handling match the rest of the app. Recurring
 * masters keep their `recurrenceRule`/`isMaster` so the store's render-time
 * expansion (`getExpandedEvents`) produces their occurrences.
 *
 * @param icsText Raw ICS document text
 * @returns Parsed events ready to be persisted (without `id`/`feedId`)
 * @throws If the body cannot be parsed as an iCalendar document
 */
export function parseIcalEvents(icsText: string): ParsedIcalEvent[] {
  const jcalData = ICAL.parse(icsText);
  const vcalendar = new ICAL.Component(jcalData);
  const vevents = vcalendar.getAllSubcomponents("vevent");

  return vevents.map((vevent) => {
    const event = convertVEventToCalendarEvent(vevent);
    // Strip placeholder/DB-managed fields so the persistence layer assigns
    // them and the caller's feedId wins.
    const {
      id: _id,
      feedId: _feedId,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      organizer: _organizer,
      attendees: _attendees,
      ...rest
    } = event;
    void _id;
    void _feedId;
    void _createdAt;
    void _updatedAt;
    void _organizer;
    void _attendees;
    // ICS subscriptions are flat documents synced as a unit: recurring masters
    // are expanded at render time (store.getExpandedEvents). We deliberately do
    // NOT persist DB-level instance linkage, because `masterEventId` is a
    // self-referencing foreign key and a RECURRENCE-ID's derived id would point
    // at a row that does not exist in this feed, causing an FK violation on
    // insert. Null them so every parsed event is a standalone/master row.
    return {
      ...rest,
      masterEventId: null,
      recurringEventId: null,
    };
  });
}

/**
 * Fetches an iCal URL and parses it into calendar events.
 *
 * The URL is normalized first, then fetched server-side (to avoid browser CORS
 * with arbitrary hosts). A non-success HTTP status or an unparseable body
 * throws, so callers can surface a sync error without destroying previously
 * synced events.
 *
 * @param url Raw user-supplied URL
 * @param fetchImpl Injectable fetch (defaults to global fetch); used by tests
 * @returns Parsed events ready to be persisted
 */
export async function fetchIcalEvents(
  url: string,
  fetchImpl: typeof fetch = fetch
): Promise<ParsedIcalEvent[]> {
  const normalized = normalizeIcalUrl(url);

  let response: Response;
  try {
    response = await fetchImpl(normalized, {
      headers: { Accept: "text/calendar, text/plain, */*" },
      redirect: "follow",
    });
  } catch (error) {
    logger.error(
      "Failed to fetch iCal feed",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        url: normalized,
      },
      LOG_SOURCE
    );
    throw new Error(
      `Failed to fetch iCal feed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch iCal feed (HTTP ${response.status})`
    );
  }

  // Reject obviously oversized payloads early when the server advertises a size.
  const contentLength = response.headers?.get?.("content-length");
  if (contentLength && Number(contentLength) > MAX_ICS_BYTES) {
    throw new Error("iCal feed is too large");
  }

  const body = await response.text();
  // Backstop for servers that do not send Content-Length.
  if (body.length > MAX_ICS_BYTES) {
    throw new Error("iCal feed is too large");
  }

  try {
    return parseIcalEvents(body);
  } catch (error) {
    logger.error(
      "Failed to parse iCal feed",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        url: normalized,
      },
      LOG_SOURCE
    );
    throw new Error(
      `Failed to parse iCal feed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
