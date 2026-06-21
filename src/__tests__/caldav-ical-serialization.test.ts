import { ConnectedAccount } from "@prisma/client";

import { CalDAVCalendarService } from "@/lib/caldav-calendar";
import { CalendarEventInput } from "@/lib/caldav-interfaces";

// `convertToICalendar` is the private serializer that builds the iCalendar
// payload PUT to the CalDAV server. We exercise it directly because it is pure
// (no network/DB), which lets us assert the exact wire format that strict
// servers (Baikal, Nextcloud) validate. See GitHub issue #100.
function serialize(
  service: CalDAVCalendarService,
  event: CalendarEventInput
): string {
  return (
    service as unknown as {
      convertToICalendar(event: CalendarEventInput): string;
    }
  ).convertToICalendar(event);
}

function makeService(): CalDAVCalendarService {
  const account = {
    id: "acct-1",
    email: "user@example.com",
    caldavUrl: "https://example.com/dav",
    caldavUsername: "user",
    accessToken: "secret",
  } as unknown as ConnectedAccount;
  return new CalDAVCalendarService(account);
}

describe("CalDAVCalendarService.convertToICalendar - all-day events (issue #100)", () => {
  it("emits a single VALUE=DATE parameter on DTSTART and DTEND", () => {
    const ical = serialize(makeService(), {
      id: "test-123",
      title: "Test",
      start: new Date("2025-04-06T00:00:00Z"),
      end: new Date("2025-04-07T00:00:00Z"),
      allDay: true,
    });

    const dtstartLine = ical
      .split(/\r?\n/)
      .find((l) => l.startsWith("DTSTART"));
    const dtendLine = ical.split(/\r?\n/).find((l) => l.startsWith("DTEND"));

    expect(dtstartLine).toBeDefined();
    expect(dtendLine).toBeDefined();

    // Valid RFC 5545 all-day: exactly one VALUE=DATE and a YYYYMMDD value.
    expect(dtstartLine).toMatch(/^DTSTART;VALUE=DATE:\d{8}$/);
    expect(dtendLine).toMatch(/^DTEND;VALUE=DATE:\d{8}$/);

    // Regression guard: the original bug emitted `VALUE=date;VALUE=DATE`.
    expect(ical).not.toMatch(/VALUE=date;VALUE=DATE/i);

    // The VALUE parameter must not appear more than once per property.
    const countValue = (line: string) =>
      (line.match(/VALUE=/gi) || []).length;
    expect(countValue(dtstartLine!)).toBe(1);
    expect(countValue(dtendLine!)).toBe(1);
  });
});

describe("CalDAVCalendarService.convertToICalendar - timed events (regression)", () => {
  it("serializes DTSTART/DTEND as date-time with no VALUE parameter", () => {
    const ical = serialize(makeService(), {
      id: "test-456",
      title: "Meeting",
      start: new Date("2025-04-06T09:00:00Z"),
      end: new Date("2025-04-06T10:00:00Z"),
      allDay: false,
    });

    const dtstartLine = ical
      .split(/\r?\n/)
      .find((l) => l.startsWith("DTSTART"));
    const dtendLine = ical.split(/\r?\n/).find((l) => l.startsWith("DTEND"));

    expect(dtstartLine).toBeDefined();
    expect(dtendLine).toBeDefined();

    // Date-time values carry a time component (a `T` between date and time)
    // and must not carry a VALUE parameter.
    expect(dtstartLine).toMatch(/^DTSTART[:;].*T.*$/);
    expect(dtstartLine).not.toMatch(/VALUE=/i);
    expect(dtendLine).not.toMatch(/VALUE=/i);
  });
});
