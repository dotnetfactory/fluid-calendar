import {
  assertSafeIcalHost,
  expandIcalEvents,
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

// Weekly Mondays from 2026-01-05, with the 2026-01-19 occurrence cancelled
// via EXDATE. The cancelled date must not be materialized.
const RECURRING_WITH_EXDATE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//test//EN
BEGIN:VEVENT
UID:recurring-exdate-1@example.com
SUMMARY:Weekly Standup
DTSTART:20260105T090000Z
DTEND:20260105T093000Z
RRULE:FREQ=WEEKLY;BYDAY=MO
EXDATE:20260119T090000Z
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
    // Instances are materialized standalone (no self-FK), so masterEventId must
    // be null to avoid an FK violation on insert.
    const events = parseIcalEvents(RECURRING_EVENT_ICS);
    expect(events[0].masterEventId).toBeNull();
    expect(events[0].recurringEventId).toBeNull();
  });
});

describe("expandIcalEvents", () => {
  const windowStart = new Date("2026-01-01T00:00:00.000Z");
  const windowEnd = new Date("2026-02-28T00:00:00.000Z");

  it("leaves a one-off event unchanged", () => {
    const parsed = parseIcalEvents(SINGLE_EVENT_ICS);
    const expanded = expandIcalEvents(parsed, windowStart, windowEnd);
    expect(expanded).toHaveLength(1);
    expect(expanded[0].isMaster).toBe(false);
    expect(expanded[0].title).toBe("Single Event");
  });

  it("materializes recurring occurrences within the window as renderable rows", () => {
    const parsed = parseIcalEvents(RECURRING_EVENT_ICS); // weekly Mondays from 2026-01-05
    const expanded = expandIcalEvents(parsed, windowStart, windowEnd);

    const master = expanded.filter((e) => e.isMaster);
    const instances = expanded.filter((e) => !e.isMaster);

    // A master row is kept (preserves recurrence metadata) but is skipped at
    // render time; the instances are what actually render.
    expect(master).toHaveLength(1);
    expect(master[0].recurrenceRule).toContain("FREQ=WEEKLY");

    // Mondays Jan 5..Feb 23 2026 = 8 occurrences.
    expect(instances.length).toBeGreaterThanOrEqual(7);
    instances.forEach((inst) => {
      expect(inst.isMaster).toBe(false);
      expect(inst.isRecurring).toBe(false);
      expect(inst.masterEventId).toBeNull();
      expect(inst.title).toBe("Weekly Standup");
      expect(inst.start.getTime()).toBeGreaterThanOrEqual(windowStart.getTime());
      expect(inst.start.getTime()).toBeLessThanOrEqual(windowEnd.getTime());
    });
  });

  it("preserves each occurrence's duration", () => {
    const parsed = parseIcalEvents(RECURRING_EVENT_ICS); // 30-min events
    const expanded = expandIcalEvents(parsed, windowStart, windowEnd);
    const instance = expanded.find((e) => !e.isMaster)!;
    expect(instance.end.getTime() - instance.start.getTime()).toBe(30 * 60_000);
  });

  it("does not materialize occurrences cancelled via EXDATE", () => {
    const parsed = parseIcalEvents(RECURRING_WITH_EXDATE_ICS);
    const expanded = expandIcalEvents(parsed, windowStart, windowEnd);
    const cancelled = new Date("2026-01-19T09:00:00.000Z").getTime();

    const instances = expanded.filter((e) => !e.isMaster);
    // The cancelled Monday must be absent from the materialized instances.
    expect(
      instances.some((inst) => inst.start.getTime() === cancelled)
    ).toBe(false);
    // Other Mondays in the window are still materialized.
    const other = new Date("2026-01-12T09:00:00.000Z").getTime();
    expect(instances.some((inst) => inst.start.getTime() === other)).toBe(true);
  });

  it("bounds a high-frequency unbounded rule to the instance cap quickly", () => {
    // A hostile feed with FREQ=SECONDLY and no COUNT/UNTIL would produce tens of
    // millions of occurrences across the window. Generation must be bounded (not
    // just the result sliced), so this completes fast and stays capped.
    const secondly = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//test//EN
BEGIN:VEVENT
UID:flood-1@example.com
SUMMARY:Flood
DTSTART:20260101T000000Z
DTEND:20260101T000100Z
RRULE:FREQ=SECONDLY
END:VEVENT
END:VCALENDAR`;
    const parsed = parseIcalEvents(secondly);
    const wideEnd = new Date("2029-01-01T00:00:00.000Z");

    const t0 = Date.now();
    const expanded = expandIcalEvents(parsed, windowStart, wideEnd);
    const elapsed = Date.now() - t0;

    const instances = expanded.filter((e) => !e.isMaster);
    // Capped at MAX_EXPANDED_INSTANCES (1000) and generated, not enumerated.
    expect(instances.length).toBeLessThanOrEqual(1000);
    expect(instances.length).toBeGreaterThan(0);
    // Bounded generation keeps this well under a second even on slow CI.
    expect(elapsed).toBeLessThan(5000);
  });

  it("caps total materialized rows across many recurring masters", () => {
    // 60 masters x up to 1000 instances each would be 60k rows; the feed-level
    // cap (50k) must stop expansion so a small-but-dense feed can't blow up the
    // bulk insert. Each SECONDLY master is itself per-master bounded, so this
    // stays fast.
    const masters = Array.from({ length: 60 }, (_, n) => {
      const min = String(n % 60).padStart(2, "0");
      return `BEGIN:VEVENT
UID:flood-${n}@example.com
SUMMARY:Flood ${n}
DTSTART:20260101T00${min}00Z
DTEND:20260101T00${min}30Z
RRULE:FREQ=SECONDLY
END:VEVENT`;
    }).join("\n");
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//test//EN\n${masters}\nEND:VCALENDAR`;

    const parsed = parseIcalEvents(ics);
    const expanded = expandIcalEvents(
      parsed,
      windowStart,
      new Date("2029-01-01T00:00:00.000Z")
    );

    // Hard ceiling enforced regardless of how many masters/instances were asked.
    expect(expanded.length).toBeLessThanOrEqual(50_000);
    // And it did materialize a large number (proving the cap, not an early bail).
    expect(expanded.length).toBeGreaterThan(40_000);
  });

  it("keeps a master with an unparseable rule as a single fallback row", () => {
    const parsed = parseIcalEvents(RECURRING_EVENT_ICS);
    // Corrupt the rule so RRule.fromString throws.
    parsed[0].recurrenceRule = "NOT-A-VALID-RULE";
    const expanded = expandIcalEvents(parsed, windowStart, windowEnd);
    // Falls back to keeping the original event so it isn't silently dropped.
    expect(expanded.length).toBeGreaterThanOrEqual(1);
  });
});

describe("assertSafeIcalHost", () => {
  it("allows ordinary public hostnames", () => {
    expect(() =>
      assertSafeIcalHost(new URL("https://calendar.example.com/cal.ics"))
    ).not.toThrow();
  });

  it("rejects localhost", () => {
    expect(() =>
      assertSafeIcalHost(new URL("http://localhost/cal.ics"))
    ).toThrow();
    expect(() =>
      assertSafeIcalHost(new URL("http://LOCALHOST:8080/cal.ics"))
    ).toThrow();
  });

  it("rejects loopback IPs", () => {
    expect(() =>
      assertSafeIcalHost(new URL("http://127.0.0.1/cal.ics"))
    ).toThrow();
    expect(() => assertSafeIcalHost(new URL("http://[::1]/cal.ics"))).toThrow();
  });

  it("rejects private IPv4 ranges", () => {
    expect(() =>
      assertSafeIcalHost(new URL("http://10.0.0.5/cal.ics"))
    ).toThrow();
    expect(() =>
      assertSafeIcalHost(new URL("http://192.168.1.10/cal.ics"))
    ).toThrow();
    expect(() =>
      assertSafeIcalHost(new URL("http://172.16.5.5/cal.ics"))
    ).toThrow();
  });

  it("rejects link-local and cloud metadata addresses", () => {
    expect(() =>
      assertSafeIcalHost(new URL("http://169.254.169.254/latest/meta-data/"))
    ).toThrow();
  });

  it("rejects the .internal TLD", () => {
    expect(() =>
      assertSafeIcalHost(new URL("http://metadata.internal/cal.ics"))
    ).toThrow();
  });

  it("rejects IPv4-mapped IPv6 loopback/metadata literals", () => {
    // Node canonicalizes the bracketed dotted form to the hex form
    // (::ffff:127.0.0.1 -> ::ffff:7f00:1), which an earlier dotted-only check
    // missed - letting a user reach loopback/metadata via a mapped literal.
    expect(() =>
      assertSafeIcalHost(new URL("http://[::ffff:127.0.0.1]/cal.ics"))
    ).toThrow();
    expect(() =>
      assertSafeIcalHost(new URL("http://[::ffff:7f00:1]/cal.ics"))
    ).toThrow();
    expect(() =>
      assertSafeIcalHost(new URL("http://[::ffff:169.254.169.254]/meta"))
    ).toThrow();
    expect(() =>
      assertSafeIcalHost(new URL("http://[::ffff:a9fe:a9fe]/meta"))
    ).toThrow();
    expect(() =>
      assertSafeIcalHost(new URL("http://[::ffff:10.0.0.1]/cal.ics"))
    ).toThrow();
  });

  it("still allows an IPv4-mapped IPv6 public address", () => {
    // A mapped public address (8.8.8.8 -> ::ffff:808:808) must NOT be rejected.
    expect(() =>
      assertSafeIcalHost(new URL("http://[::ffff:808:808]/cal.ics"))
    ).not.toThrow();
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
