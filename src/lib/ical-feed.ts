import { CalendarEvent } from "@prisma/client";
import { lookup } from "dns/promises";
import ICAL from "ical.js";
import net from "net";
import { RRule } from "rrule";

import { convertVEventToCalendarEvent } from "./caldav-helpers";
import { newDate } from "./date-utils";
import { logger } from "./logger";

const LOG_SOURCE = "ICalFeed";

// Cap the ICS body we read from an arbitrary user-supplied URL to avoid pulling
// an unbounded response into memory (mild SSRF/abuse hardening).
const MAX_ICS_BYTES = 10 * 1024 * 1024; // 10 MB

// Abort a slow/hung fetch so it can't tie up a worker indefinitely.
const FETCH_TIMEOUT_MS = 15_000;

// Safety cap on materialized occurrences per recurring master. ICS feeds are
// static documents synced as a unit, so callers expand into a bounded window
// (like the Google provider stores instances) rather than relying on the render
// path, which only expands masters when explicitly asked.
const MAX_EXPANDED_INSTANCES = 1000;

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
 * Returns true if an IP address string is in a loopback, private, link-local,
 * or otherwise non-public range that we must not let a user-supplied URL reach.
 */
function isPrivateIp(ip: string): boolean {
  const type = net.isIP(ip);

  if (type === 4) {
    const parts = ip.split(".").map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8 private
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
    if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
    if (a >= 224) return true; // multicast / reserved
    return false;
  }

  if (type === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true; // loopback / unspecified
    if (lower.startsWith("fe80")) return true; // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique-local
    // IPv4-mapped IPv6 (::ffff:a.b.c.d) - validate the embedded v4.
    const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return false;
  }

  // Not a recognizable IP literal.
  return false;
}

/**
 * Rejects URLs whose host is loopback, a literal private/link-local IP, a
 * cloud metadata endpoint, or an internal-only hostname. This is the
 * synchronous, hostname-level SSRF guard; `assertResolvedHostSafe` adds a
 * DNS-resolution check for hostnames that resolve into private space.
 *
 * @throws If the host must not be fetched
 */
export function assertSafeIcalHost(parsed: URL): void {
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (!host) {
    throw new Error("iCal URL has no host");
  }

  // Obvious internal names.
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host.endsWith(".local")
  ) {
    throw new Error(`Refusing to fetch internal host: ${host}`);
  }

  // Literal IP host in a non-public range.
  if (net.isIP(host) && isPrivateIp(host)) {
    throw new Error(`Refusing to fetch private address: ${host}`);
  }
}

/**
 * Resolves the host and rejects if any resolved address is in private space.
 * Catches public hostnames that point at internal IPs (a common SSRF vector).
 * Best-effort: if resolution fails we let the fetch surface the network error.
 */
async function assertResolvedHostSafe(parsed: URL): Promise<void> {
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  // Literal IPs are already covered by assertSafeIcalHost.
  if (net.isIP(host)) return;

  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    // DNS failure: let the actual fetch report the connection error.
    return;
  }

  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new Error(
        `Refusing to fetch host that resolves to a private address: ${host}`
      );
    }
  }
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
 * Materializes recurring masters into concrete occurrence rows within a window.
 *
 * The calendar render path (`getAllCalendarItems` -> `getExpandedEvents`) does
 * NOT expand masters (it only emits stored instances), so a master alone would
 * be invisible. Mirroring the Google provider, we persist a master row (kept
 * for metadata, skipped at render because `isMaster` is true) plus standalone
 * instance rows that actually render. Instances carry no `masterEventId` to
 * avoid a self-FK violation on a single-pass `createMany`.
 *
 * @param events Parsed events (from `parseIcalEvents`)
 * @param windowStart Earliest occurrence to materialize
 * @param windowEnd Latest occurrence to materialize
 * @returns Events ready to persist (masters + materialized instances + one-offs)
 */
export function expandIcalEvents(
  events: ParsedIcalEvent[],
  windowStart: Date,
  windowEnd: Date
): ParsedIcalEvent[] {
  const result: ParsedIcalEvent[] = [];

  for (const event of events) {
    if (!event.isMaster || !event.recurrenceRule) {
      result.push(event);
      continue;
    }

    // Keep the master row (preserves recurrence metadata; not rendered).
    result.push(event);

    try {
      const start = newDate(event.start);
      const end = newDate(event.end);
      const duration = end.getTime() - start.getTime();

      // The stored recurrenceRule is just the RRULE body (no DTSTART), so anchor
      // it on the event's start - otherwise rrule has no origin and yields no
      // occurrences.
      const options = RRule.parseString(event.recurrenceRule);
      options.dtstart = start;
      const rule = new RRule(options);

      const occurrences = rule
        .between(windowStart, windowEnd, true)
        .slice(0, MAX_EXPANDED_INSTANCES);

      for (const date of occurrences) {
        const instanceStart = newDate(date);
        result.push({
          ...event,
          externalEventId: event.externalEventId
            ? `${event.externalEventId}_${instanceStart.toISOString()}`
            : null,
          start: instanceStart,
          end: newDate(instanceStart.getTime() + duration),
          isMaster: false,
          isRecurring: false,
          recurrenceRule: null,
          masterEventId: null,
          recurringEventId: null,
        });
      }
    } catch (error) {
      // Unparseable rule: the master row we already pushed is the fallback so
      // the event isn't silently dropped.
      logger.warn(
        "Failed to expand iCal recurrence rule",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          recurrenceRule: event.recurrenceRule,
        },
        LOG_SOURCE
      );
    }
  }

  return result;
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
  const body = await fetchIcalBody(url, fetchImpl);

  try {
    return parseIcalEvents(body);
  } catch (error) {
    logger.error(
      "Failed to parse iCal feed",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    throw new Error(
      `Failed to parse iCal feed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Fetches the raw ICS body for a URL with SSRF and resource-exhaustion guards:
 * scheme + host validation, DNS-resolution check, no automatic redirect
 * following (each hop is re-validated), an abort timeout, and a hard byte cap
 * read from the response stream.
 */
async function fetchIcalBody(
  url: string,
  fetchImpl: typeof fetch
): Promise<string> {
  let current = normalizeIcalUrl(url);
  const MAX_REDIRECTS = 5;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const parsed = new URL(current);
    // Re-validate every hop so a public host can't 30x-redirect to an internal
    // address (and the initial target is validated too).
    assertSafeIcalHost(parsed);
    await assertResolvedHostSafe(parsed);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetchImpl(current, {
        headers: { Accept: "text/calendar, text/plain, */*" },
        redirect: "manual",
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timer);
      logger.error(
        "Failed to fetch iCal feed",
        { error: error instanceof Error ? error.message : "Unknown error" },
        LOG_SOURCE
      );
      throw new Error(
        `Failed to fetch iCal feed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    // Manual redirect handling: validate the next hop before following it.
    if (response.status >= 300 && response.status < 400) {
      clearTimeout(timer);
      const location = response.headers?.get?.("location");
      if (!location) {
        throw new Error("iCal feed returned a redirect with no location");
      }
      current = normalizeIcalUrl(new URL(location, current).toString());
      continue;
    }

    try {
      if (!response.ok) {
        throw new Error(`Failed to fetch iCal feed (HTTP ${response.status})`);
      }

      // Reject early when the server advertises an oversized payload.
      const contentLength = response.headers?.get?.("content-length");
      if (contentLength && Number(contentLength) > MAX_ICS_BYTES) {
        throw new Error("iCal feed is too large");
      }

      return await readBodyWithCap(response);
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error("iCal feed exceeded the maximum number of redirects");
}

/**
 * Reads a response body enforcing a hard byte cap. Prefers streaming so an
 * oversized or chunked (no Content-Length) response is aborted mid-read instead
 * of being fully buffered; falls back to `text()` when no stream is available
 * (e.g. mocked responses in tests).
 */
async function readBodyWithCap(response: Response): Promise<string> {
  const body = response.body as ReadableStream<Uint8Array> | null | undefined;

  if (!body || typeof body.getReader !== "function") {
    const text = await response.text();
    if (text.length > MAX_ICS_BYTES) {
      throw new Error("iCal feed is too large");
    }
    return text;
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let result = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        received += value.byteLength;
        if (received > MAX_ICS_BYTES) {
          throw new Error("iCal feed is too large");
        }
        result += decoder.decode(value, { stream: true });
      }
    }
    result += decoder.decode();
    return result;
  } finally {
    reader.releaseLock?.();
  }
}
