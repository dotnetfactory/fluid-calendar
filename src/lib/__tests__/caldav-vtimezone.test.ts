import ICAL from "ical.js";

import { buildVTimezoneComponent, zonedTime } from "@/lib/caldav-vtimezone";

jest.mock("@/lib/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

/**
 * Unit tests for the VTIMEZONE generator backing the CalDAV timezone fix
 * (GitHub issue #135). `ical.js` ships no IANA database, so we build VTIMEZONE
 * components from the platform `Intl` timezone data; these tests assert the
 * generated components convert instants correctly across DST and hemispheres.
 */

/**
 * Resolve a zoned wall-clock back to an absolute instant via the generated
 * VTIMEZONE. `wall` is `YYYY-MM-DDTHH:MM:SS` (extended iCal date-time form).
 */
function instantFromZoned(timeZone: string, wall: string): Date {
  const vtz = buildVTimezoneComponent(timeZone);
  if (!vtz) throw new Error(`no VTIMEZONE for ${timeZone}`);
  const tz = new ICAL.Timezone(vtz);
  // fromDateTimeString wants extended form (YYYY-MM-DDTHH:MM:SS).
  const extended = wall.replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/,
    "$1-$2-$3T$4:$5:$6"
  );
  const time = ICAL.Time.fromDateTimeString(extended);
  time.zone = tz;
  return time.toJSDate();
}

describe("buildVTimezoneComponent", () => {
  it("returns null for an invalid timezone", () => {
    expect(buildVTimezoneComponent("Not/AZone")).toBeNull();
  });

  it("builds a DST-aware zone with DAYLIGHT and STANDARD subcomponents", () => {
    const vtz = buildVTimezoneComponent("America/New_York");
    expect(vtz).toBeTruthy();
    const ics = vtz!.toString();
    expect(ics).toContain("TZID:America/New_York");
    expect(ics).toContain("BEGIN:DAYLIGHT");
    expect(ics).toContain("BEGIN:STANDARD");
    expect(ics).toContain("TZOFFSETTO:-0400"); // EDT
    expect(ics).toContain("TZOFFSETTO:-0500"); // EST
  });

  it("builds a single fixed-offset STANDARD for a no-DST zone", () => {
    const vtz = buildVTimezoneComponent("Asia/Shanghai");
    expect(vtz).toBeTruthy();
    const ics = vtz!.toString();
    expect(ics).toContain("BEGIN:STANDARD");
    expect(ics).not.toContain("BEGIN:DAYLIGHT");
    expect(ics).toContain("TZOFFSETTO:+0800");
  });

  it("resolves wall-clock to the correct instant across a DST boundary (NY)", () => {
    // EST (winter): 09:00 local is 14:00Z.
    expect(instantFromZoned("America/New_York", "20250115T090000")).toEqual(
      new Date("2025-01-15T14:00:00.000Z")
    );
    // EDT (summer): 09:00 local is 13:00Z.
    expect(instantFromZoned("America/New_York", "20250715T090000")).toEqual(
      new Date("2025-07-15T13:00:00.000Z")
    );
  });

  it("resolves correctly for a southern-hemisphere zone (Sydney)", () => {
    // Sydney winter (Jul) is AEST +1000: 09:00 local is 23:00Z previous day.
    expect(instantFromZoned("Australia/Sydney", "20250715T090000")).toEqual(
      new Date("2025-07-14T23:00:00.000Z")
    );
    // Sydney summer (Jan) is AEDT +1100: 09:00 local is 22:00Z previous day.
    expect(instantFromZoned("Australia/Sydney", "20250115T090000")).toEqual(
      new Date("2025-01-14T22:00:00.000Z")
    );
  });
});

describe("zonedTime", () => {
  it("expresses a UTC instant as the wall-clock in the given timezone", () => {
    // 01:30Z is 09:30 in Asia/Shanghai (+0800).
    const t = zonedTime(new Date("2025-06-19T01:30:00.000Z"), "Asia/Shanghai");
    expect(t.toICALString()).toBe("20250619T093000");
    expect(t.zone.tzid).toBe("Asia/Shanghai");
  });
});
