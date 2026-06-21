import { ConnectedAccount } from "@prisma/client";
import ICAL from "ical.js";

import { CalDAVCalendarService } from "@/lib/caldav-calendar";
import { CalendarEventInput } from "@/lib/caldav-interfaces";

/**
 * Regression tests for GitHub issue #135: CalDAV events created/updated by
 * FluidCalendar were serialized with a *floating* DTSTART/DTEND (no `Z` and no
 * `TZID`), so other clients (Thunderbird, Home Assistant) re-interpreted them in
 * their own timezone and showed the event shifted by the server/client UTC
 * offset. Timed instants must serialize as UTC (`...Z`).
 *
 * `convertToICalendar` is private and side-effect free (no network/DB), so we
 * reach it through a typed cast on a service constructed with a stub account.
 */

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
    };

    const ical = convert(event);
    const dtstart = propLine(ical, "DTSTART");
    const dtend = propLine(ical, "DTEND");

    expect(dtstart).toBe("DTSTART;VALUE=DATE:20250619");
    expect(dtend).toBe("DTEND;VALUE=DATE:20250620");
    expect(dtstart).not.toMatch(/Z/);
    // exactly one VALUE parameter (issue #100 regression guard)
    expect(dtstart.match(/VALUE=/g)?.length).toBe(1);
  });

  // RECURRENCE-ID (single-instance update) and EXDATE (single-instance delete)
  // are built deep inside updateEvent/deleteEvent behind network calls; here we
  // assert the underlying serialization primitive those paths now use produces a
  // UTC (`...Z`) value, the same correctness guarantee as DTSTART/DTEND.
  it("serializes RECURRENCE-ID / EXDATE instants in UTC with a Z designator", () => {
    const instant = new Date("2025-06-19T09:30:00.000Z");

    const recurrenceId = new ICAL.Property("recurrence-id");
    recurrenceId.setValue(ICAL.Time.fromJSDate(instant, true));
    recurrenceId.setParameter("value", "date-time");

    const exdate = new ICAL.Property("exdate");
    exdate.setValue(ICAL.Time.fromJSDate(instant, true));
    exdate.setParameter("value", "date-time");

    expect(recurrenceId.toICALString()).toMatch(/:20250619T093000Z$/);
    expect(exdate.toICALString()).toMatch(/:20250619T093000Z$/);
  });
});
