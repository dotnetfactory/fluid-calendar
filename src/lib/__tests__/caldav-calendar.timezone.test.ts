import { ConnectedAccount } from "@prisma/client";
import ICAL from "ical.js";

import { CalDAVCalendarService } from "@/lib/caldav-calendar";
import { CalendarEventInput } from "@/lib/caldav-interfaces";
import { prisma } from "@/lib/prisma";
import { CalendarEventWithFeed } from "@/types/calendar";

/**
 * Regression tests for GitHub issue #135: CalDAV events created/updated by
 * FluidCalendar were serialized with a *floating* DTSTART/DTEND (no `Z` and no
 * `TZID`), so other clients (Thunderbird, Home Assistant) re-interpreted them in
 * their own timezone and showed the event shifted by the server/client UTC
 * offset. Timed instants must serialize as UTC (`...Z`).
 *
 * `convertToICalendar` is private and side-effect free (no network/DB), so we
 * reach it through a typed cast on a service constructed with a stub account.
 * The single-instance RECURRENCE-ID / EXDATE paths are exercised through the
 * real `deleteEvent` method with prisma and fetch mocked, so we assert the
 * actual PUT body sent to the server.
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    calendarEvent: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const stubAccount = {
  id: "acct-1",
  email: "user@example.com",
  caldavUsername: "user@example.com",
  accessToken: "token",
  caldavUrl: "https://dav.example.com",
} as unknown as ConnectedAccount;

function convert(event: CalendarEventInput): string {
  const service = new CalDAVCalendarService(stubAccount);
  return (
    service as unknown as { convertToICalendar(e: CalendarEventInput): string }
  ).convertToICalendar(event);
}

/** Pull a single iCalendar property line by name (unfolds nothing fancy). */
function propLine(ical: string, name: string): string {
  const line = ical
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${name}:`) || l.startsWith(`${name};`));
  if (!line) throw new Error(`property ${name} not found in:\n${ical}`);
  return line;
}

/**
 * Pull a property line from the VEVENT only (ignoring any VTIMEZONE block, which
 * also contains DTSTART lines). Used by the TZID + VTIMEZONE tests.
 */
function eventPropLine(ical: string, name: string): string {
  const lines = ical.split(/\r?\n/);
  const start = lines.indexOf("BEGIN:VEVENT");
  const end = lines.indexOf("END:VEVENT");
  const within = lines.slice(start, end === -1 ? undefined : end + 1);
  const line = within.find(
    (l) => l.startsWith(`${name}:`) || l.startsWith(`${name};`)
  );
  if (!line) throw new Error(`property ${name} not found in VEVENT of:\n${ical}`);
  return line;
}

describe("CalDAV serialization timezone handling (issue #135)", () => {
  it("emits timed DTSTART/DTEND in UTC with a Z designator (no floating time)", () => {
    const event: CalendarEventInput = {
      id: "evt-1",
      title: "Standup",
      // 2025-06-19T09:30:00Z (the issue's instant). In UTC-8 source data this
      // is what the user means; the serialized form must be unambiguous UTC.
      start: new Date("2025-06-19T09:30:00.000Z"),
      end: new Date("2025-06-19T11:30:00.000Z"),
      allDay: false,
    };

    const ical = convert(event);
    const dtstart = propLine(ical, "DTSTART");
    const dtend = propLine(ical, "DTEND");

    expect(dtstart).toBe("DTSTART:20250619T093000Z");
    expect(dtend).toBe("DTEND:20250619T113000Z");

    // No floating time, no TZID, no VALUE parameter on timed events.
    expect(dtstart).not.toMatch(/TZID/);
    expect(dtstart).not.toMatch(/VALUE/);
    expect(dtstart).toMatch(/Z$/);
    expect(dtend).toMatch(/Z$/);
  });

  it("serializes the correct UTC instant across DST (summer and winter)", () => {
    const summer: CalendarEventInput = {
      id: "evt-summer",
      title: "Summer",
      start: new Date("2025-07-01T14:00:00.000Z"),
      end: new Date("2025-07-01T15:00:00.000Z"),
      allDay: false,
    };
    const winter: CalendarEventInput = {
      id: "evt-winter",
      title: "Winter",
      start: new Date("2025-01-15T14:00:00.000Z"),
      end: new Date("2025-01-15T15:00:00.000Z"),
      allDay: false,
    };

    expect(propLine(convert(summer), "DTSTART")).toBe(
      "DTSTART:20250701T140000Z"
    );
    expect(propLine(convert(winter), "DTSTART")).toBe(
      "DTSTART:20250115T140000Z"
    );
  });

  it("serializes the same UTC value regardless of the server's local timezone", () => {
    const event: CalendarEventInput = {
      id: "evt-tz",
      title: "TZ-independent",
      start: new Date("2025-06-19T09:30:00.000Z"),
      end: new Date("2025-06-19T11:30:00.000Z"),
      allDay: false,
    };

    const originalTZ = process.env.TZ;
    try {
      process.env.TZ = "UTC";
      const utc = propLine(convert(event), "DTSTART");
      process.env.TZ = "Asia/Shanghai";
      const shanghai = propLine(convert(event), "DTSTART");
      process.env.TZ = "America/New_York";
      const newYork = propLine(convert(event), "DTSTART");

      expect(utc).toBe("DTSTART:20250619T093000Z");
      expect(shanghai).toBe(utc);
      expect(newYork).toBe(utc);
    } finally {
      process.env.TZ = originalTZ;
    }
  });

  it("leaves all-day events as floating VALUE=DATE (unchanged, no Z)", () => {
    const event: CalendarEventInput = {
      id: "evt-allday",
      title: "Holiday",
      start: new Date("2025-06-19T00:00:00.000Z"),
      end: new Date("2025-06-20T00:00:00.000Z"),
      allDay: true,
      // A timezone on an all-day event must NOT introduce a VTIMEZONE/TZID.
      timeZone: "America/New_York",
    };

    const ical = convert(event);
    const dtstart = propLine(ical, "DTSTART");
    const dtend = propLine(ical, "DTEND");

    expect(dtstart).toBe("DTSTART;VALUE=DATE:20250619");
    expect(dtend).toBe("DTEND;VALUE=DATE:20250620");
    expect(dtstart).not.toMatch(/Z/);
    // exactly one VALUE parameter (issue #100 regression guard)
    expect(dtstart.match(/VALUE=/g)?.length).toBe(1);
    expect(ical).not.toContain("BEGIN:VTIMEZONE");
  });

  // When the user's timezone is known we emit `DTSTART;TZID=<zone>` + a
  // VTIMEZONE so recurring events keep their wall-clock time across DST. UTC
  // `Z` + RRULE would drift by an hour after a DST change (Codex finding).
  describe("timed events with a known timezone use TZID + VTIMEZONE", () => {
    it("emits DTSTART;TZID with local wall-clock and an accompanying VTIMEZONE", () => {
      const ical = convert({
        id: "evt-tz",
        title: "9:30 Shanghai",
        // 09:30 in Asia/Shanghai (UTC+8) is 01:30Z.
        start: new Date("2025-06-19T01:30:00.000Z"),
        end: new Date("2025-06-19T03:30:00.000Z"),
        allDay: false,
        timeZone: "Asia/Shanghai",
      });

      expect(eventPropLine(ical, "DTSTART")).toBe(
        "DTSTART;TZID=Asia/Shanghai:20250619T093000"
      );
      expect(eventPropLine(ical, "DTEND")).toBe(
        "DTEND;TZID=Asia/Shanghai:20250619T113000"
      );
      expect(ical).toContain("BEGIN:VTIMEZONE");
      expect(ical).toContain("TZID:Asia/Shanghai");
      expect(ical).toContain("END:VTIMEZONE");
    });

    it("keeps a recurring event's wall-clock time across a DST transition", () => {
      // Daily 09:00 America/New_York starting before the March DST switch.
      const ical = convert({
        id: "evt-recur",
        title: "Daily 9am NY",
        start: new Date("2025-03-01T14:00:00.000Z"), // 09:00 EST
        end: new Date("2025-03-01T14:30:00.000Z"),
        allDay: false,
        isRecurring: true,
        recurrenceRule: "FREQ=DAILY",
        timeZone: "America/New_York",
      });

      // Register the embedded VTIMEZONE, expand the series, and confirm every
      // occurrence stays at 09:00 NY wall-clock even after DST starts.
      const comp = new ICAL.Component(ICAL.parse(ical));
      const vtz = comp.getFirstSubcomponent("vtimezone");
      expect(vtz).toBeTruthy();
      // A Timezone built from the VTIMEZONE carries its own TZID, so the 1-arg
      // register() form is correct (and matches the ical.js typings).
      const nyZone = new ICAL.Timezone(vtz!);
      ICAL.TimezoneService.register(nyZone);
      try {
        const event = new ICAL.Event(comp.getFirstSubcomponent("vevent")!);
        const iter = event.iterator();
        const nyHours = new Set<string>();
        for (let i = 0; i < 30; i++) {
          const occ = iter.next();
          if (!occ) break;
          nyHours.add(
            new Intl.DateTimeFormat("en-US", {
              timeZone: "America/New_York",
              hour: "2-digit",
              minute: "2-digit",
              hourCycle: "h23",
            }).format(occ.toJSDate())
          );
        }
        // All 30 occurrences (spanning the Mar 9 DST switch) are 09:00 local.
        expect([...nyHours]).toEqual(["09:00"]);
      } finally {
        ICAL.TimezoneService.remove("America/New_York");
      }
    });

    it("handles a no-DST zone with a single fixed-offset STANDARD block", () => {
      const ical = convert({
        id: "evt-kolkata",
        title: "Kolkata",
        start: new Date("2025-06-19T04:00:00.000Z"), // 09:30 IST (+0530)
        end: new Date("2025-06-19T05:00:00.000Z"),
        allDay: false,
        timeZone: "Asia/Kolkata",
      });
      expect(eventPropLine(ical, "DTSTART")).toBe(
        "DTSTART;TZID=Asia/Kolkata:20250619T093000"
      );
      expect(ical).toContain("TZOFFSETTO:+0530");
      expect(ical).toContain("BEGIN:STANDARD");
      expect(ical).not.toContain("BEGIN:DAYLIGHT");
    });

    it("falls back to UTC when the timezone is invalid", () => {
      const ical = convert({
        id: "evt-bad",
        title: "Bad TZ",
        start: new Date("2025-06-19T09:30:00.000Z"),
        end: new Date("2025-06-19T11:30:00.000Z"),
        allDay: false,
        timeZone: "Not/AZone",
      });
      expect(propLine(ical, "DTSTART")).toBe("DTSTART:20250619T093000Z");
      expect(ical).not.toContain("BEGIN:VTIMEZONE");
    });
  });
});

/**
 * Single-instance EXDATE serialization, driven through the real `deleteEvent`
 * code path (prisma + fetch + the CalDAV client mocked) so we assert the actual
 * PUT body the server receives. The EXDATE value type MUST match the master
 * DTSTART's value type, otherwise the server cannot pair the exception with the
 * instance and the single-instance delete silently no-ops:
 *   - timed master  -> UTC date-time EXDATE (`...Z`), issue #135
 *   - all-day master -> floating `VALUE=DATE` EXDATE (no Z, no duplicate VALUE
 *     parameter), issue #100/#135.
 */
describe("CalDAV single-instance EXDATE value-type matching (issues #135/#100)", () => {
  const findFirstMock = prisma.calendarEvent.findFirst as jest.Mock;
  const instanceStart = new Date("2025-06-19T09:30:00.000Z");

  function makeInstance(): CalendarEventWithFeed {
    return {
      id: "instance-1",
      feedId: "feed-1",
      isRecurring: true,
      masterEventId: "master-1",
      start: instanceStart,
      end: new Date("2025-06-19T11:30:00.000Z"),
    } as unknown as CalendarEventWithFeed;
  }

  /**
   * Wire up the mocks so `deleteEvent` reaches the EXDATE block, and return a
   * getter for the body PUT to the master event URL.
   *
   * @param masterDtstartLine the master VEVENT's DTSTART line (timed or DATE)
   */
  function setup(masterDtstartLine: string): () => string {
    findFirstMock.mockResolvedValue({
      id: "master-1",
      externalEventId: "master-ext",
      recurrenceRule: "FREQ=DAILY",
    });

    const masterIcs = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "UID:master-ext",
      masterDtstartLine,
      "RRULE:FREQ=DAILY",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    let putBody = "";
    const fetchMock = jest.fn(
      async (_url: string, init?: { method?: string; body?: string }) => {
        const method = init?.method ?? "GET";
        if (method === "DELETE") {
          return { ok: true, status: 200, statusText: "OK" } as Response;
        }
        if (method === "PUT") {
          putBody = init?.body ?? "";
          return { ok: true, status: 200, statusText: "OK" } as Response;
        }
        // GET of the master event
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          text: async () => masterIcs,
        } as unknown as Response;
      }
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    return () => putBody;
  }

  /**
   * A service with the bits `deleteEvent` calls outside the EXDATE block stubbed:
   * `getClient` (only used for the DELETE fallback) and `syncCalendar` (runs
   * after the EXDATE PUT and would otherwise hit the full sync pipeline).
   */
  function makeService(): CalDAVCalendarService {
    const service = new CalDAVCalendarService(stubAccount);
    (
      service as unknown as { getClient: () => Promise<unknown> }
    ).getClient = jest.fn().mockResolvedValue({
      deleteObject: jest.fn().mockResolvedValue({ status: 200 }),
    });
    (
      service as unknown as { syncCalendar: () => Promise<unknown> }
    ).syncCalendar = jest
      .fn()
      .mockResolvedValue({ added: [], updated: [], deleted: [] });
    return service;
  }

  function exdateLine(ical: string): string {
    const line = ical
      .split(/\r?\n/)
      .find((l) => l.startsWith("EXDATE:") || l.startsWith("EXDATE;"));
    if (!line) throw new Error(`EXDATE not found in:\n${ical}`);
    return line;
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("writes a UTC date-time EXDATE for a timed recurring master", async () => {
    const getBody = setup("DTSTART:20250619T093000Z");
    const service = makeService();

    await service.deleteEvent(
      makeInstance(),
      "/calendars/user/cal",
      "instance-ext",
      "single",
      "user-1"
    );

    const line = exdateLine(getBody());
    expect(line).toBe("EXDATE:20250619T093000Z");
    expect(line).toMatch(/Z$/);
    expect(line).not.toMatch(/VALUE=DATE/);
  });

  it("writes a floating VALUE=DATE EXDATE for an all-day recurring master", async () => {
    const getBody = setup("DTSTART;VALUE=DATE:20250619");
    const service = makeService();

    await service.deleteEvent(
      makeInstance(),
      "/calendars/user/cal",
      "instance-ext",
      "single",
      "user-1"
    );

    const line = exdateLine(getBody());
    expect(line).toBe("EXDATE;VALUE=DATE:20250619");
    expect(line).not.toMatch(/Z/);
    // exactly one VALUE parameter (no invalid VALUE=date;VALUE=DATE, issue #100)
    expect(line.match(/VALUE=/g)?.length).toBe(1);
  });

  it("writes a TZID EXDATE matching a TZID master's DTSTART value form", async () => {
    // Master uses DTSTART;TZID=...; the EXDATE must carry the same TZID and the
    // instance's wall-clock in that zone, not a UTC value, so servers that key
    // exceptions by DTSTART value semantics pair it with the right instance.
    const getBody = setup("DTSTART;TZID=America/New_York:20250619T053000");
    const service = makeService();

    await service.deleteEvent(
      makeInstance(), // instanceStart = 2025-06-19T09:30:00Z = 05:30 EDT
      "/calendars/user/cal",
      "instance-ext",
      "single",
      "user-1"
    );

    const line = exdateLine(getBody());
    expect(line).toBe("EXDATE;TZID=America/New_York:20250619T053000");
    // Not UTC (no trailing Z designator) and not a DATE value.
    expect(line.endsWith("Z")).toBe(false);
    expect(line).not.toMatch(/VALUE=DATE/);
  });
});
