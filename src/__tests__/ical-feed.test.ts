import {
  fetchIcalEvents,
  normalizeIcalUrl,
  parseIcalEvents,
} from "@/lib/ical-feed";

const SINGLE_EVENT_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//test//EN
BEGIN:VEVENT
UID:single-1@example.com
SUMMARY:Single Event
DESCRIPTION:A one-off event
LOCATION:Munich
DTSTART:20260101T100000Z
DTEND:20260101T110000Z
END:VEVENT
END:VCALENDAR`;

const RECURRING_EVENT_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//test//EN
BEGIN:VEVENT
UID:recurring-1@example.com
SUMMARY:Weekly Standup
DTSTART:20260105T090000Z
DTEND:20260105T093000Z
RRULE:FREQ=WEEKLY;BYDAY=MO
END:VEVENT
END:VCALENDAR`;

const ALL_DAY_EVENT_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//test//EN
BEGIN:VEVENT
UID:allday-1@example.com
SUMMARY:Holiday
DTSTART;VALUE=DATE:20260101
DTEND;VALUE=DATE:20260102
END:VEVENT
END:VCALENDAR`;

const MULTI_EVENT_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//test//EN
BEGIN:VEVENT
UID:single-1@example.com
SUMMARY:Single Event
DTSTART:20260101T100000Z
DTEND:20260101T110000Z
END:VEVENT
BEGIN:VEVENT
UID:recurring-1@example.com
SUMMARY:Weekly Standup
DTSTART:20260105T090000Z
DTEND:20260105T093000Z
RRULE:FREQ=WEEKLY;BYDAY=MO
END:VEVENT
END:VCALENDAR`;

describe("normalizeIcalUrl", () => {
  it("passes through https URLs unchanged", () => {
    expect(normalizeIcalUrl("https://example.com/cal.ics")).toBe(
      "https://example.com/cal.ics"
    );
  });

  it("passes through http URLs unchanged", () => {
    expect(normalizeIcalUrl("http://example.com/cal.ics")).toBe(
      "http://example.com/cal.ics"
    );
  });

  it("rewrites webcal:// to https://", () => {
    expect(normalizeIcalUrl("webcal://example.com/cal.ics")).toBe(
      "https://example.com/cal.ics"
    );
  });

  it("rewrites webcals:// to https://", () => {
    expect(normalizeIcalUrl("webcals://example.com/cal.ics")).toBe(
      "https://example.com/cal.ics"
    );
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeIcalUrl("  https://example.com/cal.ics  ")).toBe(
      "https://example.com/cal.ics"
    );
  });

  it("rejects unsupported schemes", () => {
    expect(() => normalizeIcalUrl("file:///etc/passwd")).toThrow();
    expect(() => normalizeIcalUrl("ftp://example.com/cal.ics")).toThrow();
  });

  it("rejects empty input", () => {
    expect(() => normalizeIcalUrl("")).toThrow();
    expect(() => normalizeIcalUrl("   ")).toThrow();
  });
});

describe("parseIcalEvents", () => {
  it("parses a single one-off event", () => {
    const events = parseIcalEvents(SINGLE_EVENT_ICS);
    expect(events).toHaveLength(1);
    const event = events[0];
    expect(event.title).toBe("Single Event");
    expect(event.location).toBe("Munich");
    expect(event.isRecurring).toBe(false);
    expect(event.allDay).toBe(false);
    expect(event.start).toBeInstanceOf(Date);
    expect(event.end).toBeInstanceOf(Date);
  });

  it("parses a recurring master with its recurrence rule", () => {
    const events = parseIcalEvents(RECURRING_EVENT_ICS);
    expect(events).toHaveLength(1);
    const event = events[0];
    expect(event.title).toBe("Weekly Standup");
    expect(event.isRecurring).toBe(true);
    expect(event.isMaster).toBe(true);
    expect(event.recurrenceRule).toContain("FREQ=WEEKLY");
  });

  it("marks date-only events as all-day", () => {
    const events = parseIcalEvents(ALL_DAY_EVENT_ICS);
    expect(events).toHaveLength(1);
    expect(events[0].allDay).toBe(true);
  });

  it("parses multiple VEVENTs", () => {
    const events = parseIcalEvents(MULTI_EVENT_ICS);
    expect(events).toHaveLength(2);
    const titles = events.map((e) => e.title).sort();
    expect(titles).toEqual(["Single Event", "Weekly Standup"]);
  });

  it("returns an empty array for a calendar with no events", () => {
    const empty = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//test//EN\nEND:VCALENDAR`;
    expect(parseIcalEvents(empty)).toEqual([]);
  });

  it("throws on a body that is not a valid calendar", () => {
    expect(() => parseIcalEvents("this is not an ical document")).toThrow();
  });

  it("does not include placeholder feedId on parsed events", () => {
    const events = parseIcalEvents(SINGLE_EVENT_ICS);
    // feedId is assigned when persisting; parsed events should not carry a
    // bogus empty feedId that would override the DB write.
    expect((events[0] as Record<string, unknown>).feedId).toBeUndefined();
  });

  it("does not carry DB-level recurrence instance linkage", () => {
    // ICS masters expand at render time; we must not persist masterEventId that
    // would point at a non-existent row (FK violation on insert).
    const events = parseIcalEvents(RECURRING_EVENT_ICS);
    expect(events[0].masterEventId).toBeNull();
    expect(events[0].recurringEventId).toBeNull();
  });
});

describe("fetchIcalEvents", () => {
  it("fetches the URL and returns parsed events", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => SINGLE_EVENT_ICS,
    });

    const events = await fetchIcalEvents(
      "https://example.com/cal.ics",
      fetchImpl as unknown as typeof fetch
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://example.com/cal.ics",
      expect.any(Object)
    );
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Single Event");
  });

  it("normalizes webcal URLs before fetching", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => SINGLE_EVENT_ICS,
    });

    await fetchIcalEvents(
      "webcal://example.com/cal.ics",
      fetchImpl as unknown as typeof fetch
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://example.com/cal.ics",
      expect.any(Object)
    );
  });

  it("throws when the response is not ok", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "Not Found",
    });

    await expect(
      fetchIcalEvents(
        "https://example.com/missing.ics",
        fetchImpl as unknown as typeof fetch
      )
    ).rejects.toThrow();
  });

  it("throws when the body cannot be parsed", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "garbage not ical",
    });

    await expect(
      fetchIcalEvents(
        "https://example.com/bad.ics",
        fetchImpl as unknown as typeof fetch
      )
    ).rejects.toThrow();
  });
});
