import ICAL from "ical.js";

import { logger } from "./logger";

const LOG_SOURCE = "CalDAVVTimezone";

/**
 * Builds RFC 5545 `VTIMEZONE` components and `TZID`-qualified date-times for
 * CalDAV serialization.
 *
 * Timed events MUST be written with an explicit timezone so other clients
 * interpret them at the correct wall-clock time, AND so recurring events keep
 * their wall-clock time across DST transitions (a fixed-UTC `DTSTART` + `RRULE`
 * would drift by an hour after a DST change). See GitHub issue #135.
 *
 * `ical.js` ships no IANA timezone database, so we generate a `VTIMEZONE` from
 * the system's `Intl` timezone data: we detect the zone's offset transitions in
 * the current year and emit `STANDARD`/`DAYLIGHT` subcomponents with yearly
 * recurrence rules. `Intl.DateTimeFormat` is used for the offset lookups because
 * it is exact at transition instants (unlike some offset helpers).
 */

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

interface Transition {
  /** UTC instant (ms) at which the offset changes. */
  at: number;
  /** Offset in minutes east of UTC just before the transition. */
  from: number;
  /** Offset in minutes east of UTC at/after the transition. */
  to: number;
}

/**
 * Returns the offset (minutes east of UTC) of `timeZone` at the given UTC
 * instant, computed from the zone's wall-clock as reported by `Intl`.
 */
function offsetMinutes(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(date).map((p) => [p.type, p.value])
  ) as Record<string, string>;
  // Interpret the zone's wall-clock components as if they were UTC, then the
  // difference from the real instant is the zone's offset.
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return Math.round((asUTC - date.getTime()) / MINUTE_MS);
}

/** Short timezone name (e.g. "EST") at the given instant, advisory only. */
function shortName(timeZone: string, date: Date): string {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
      hour: "2-digit",
    });
    const part = dtf.formatToParts(date).find((p) => p.type === "timeZoneName");
    return part?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}

/**
 * Finds offset transitions for `timeZone` during `year` by scanning day-by-day
 * and binary-searching each change down to the minute.
 */
function findTransitions(timeZone: string, year: number): Transition[] {
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  const transitions: Transition[] = [];
  let prev = offsetMinutes(timeZone, new Date(start));

  for (let t = start + DAY_MS; t <= end; t += DAY_MS) {
    const off = offsetMinutes(timeZone, new Date(t));
    if (off !== prev) {
      let lo = t - DAY_MS;
      let hi = t;
      while (hi - lo > MINUTE_MS) {
        const mid = lo + Math.floor((hi - lo) / 2 / MINUTE_MS) * MINUTE_MS;
        if (offsetMinutes(timeZone, new Date(mid)) === prev) {
          lo = mid;
        } else {
          hi = mid;
        }
      }
      transitions.push({ at: hi, from: prev, to: off });
      prev = off;
    }
  }
  return transitions;
}

/**
 * The `BYDAY` ordinal + weekday for a UTC wall-clock date (e.g. {nth:2,
 * dow:"SU"} for the 2nd Sunday). When the date is the *last* occurrence of that
 * weekday in its month, returns a negative ordinal (`-1`) so the rule means
 * "last Sunday" - required for zones like Europe/London whose DST switch is the
 * last Sunday (which is the 5th Sunday some years and the 4th in others, so a
 * fixed positive ordinal would be wrong; issue #135 / Codex review).
 */
function nthWeekdayOfMonth(date: Date): { nth: number; dow: string } {
  const day = date.getUTCDate();
  const dow = WEEKDAYS[date.getUTCDay()];
  // Is there another same-weekday date later in the same month? If not, it's
  // the last occurrence -> use -1.
  const daysInMonth = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
  ).getUTCDate();
  const isLast = day + 7 > daysInMonth;
  const nth = isLast ? -1 : Math.floor((day - 1) / 7) + 1;
  return { nth, dow };
}

function offsetProperty(name: string, minutes: number): ICAL.Property {
  const prop = new ICAL.Property(name);
  prop.setValue(ICAL.UtcOffset.fromSeconds(minutes * 60));
  return prop;
}

function timeProperty(name: string, time: ICAL.Time): ICAL.Property {
  const prop = new ICAL.Property(name);
  prop.setValue(time);
  return prop;
}

/**
 * Builds a floating ICAL.Time anchored in 1970 (year-agnostic VTIMEZONE
 * DTSTART). VTIMEZONE transition DTSTARTs are local wall-clock values with no
 * `Z`, so we use `localTimezone` (it keeps the value floating).
 */
function anchoredTime(wall: Date): ICAL.Time {
  return new ICAL.Time(
    {
      year: 1970,
      month: wall.getUTCMonth() + 1,
      day: wall.getUTCDate(),
      hour: wall.getUTCHours(),
      minute: wall.getUTCMinutes(),
      second: wall.getUTCSeconds(),
      isDate: false,
    },
    ICAL.Timezone.localTimezone
  );
}

/**
 * Builds a `VTIMEZONE` component for the given IANA timezone, or `null` if the
 * timezone is invalid/unknown.
 */
export function buildVTimezoneComponent(timeZone: string): ICAL.Component | null {
  try {
    // Validate the zone: an invalid timeZone throws here.
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
  } catch {
    logger.warn(
      "Unknown timezone; cannot build VTIMEZONE",
      { timeZone },
      LOG_SOURCE
    );
    return null;
  }

  const refYear = new Date().getUTCFullYear();
  const transitions = findTransitions(timeZone, refYear);
  const vtz = new ICAL.Component("vtimezone");
  vtz.addPropertyWithValue("tzid", timeZone);

  if (transitions.length === 0) {
    // No DST: a single STANDARD subcomponent with the fixed offset.
    const fixed = offsetMinutes(timeZone, new Date(Date.UTC(refYear, 0, 1)));
    const std = new ICAL.Component(["standard", [], []]);
    std.addProperty(
      timeProperty(
        "dtstart",
        new ICAL.Time(
          {
            year: 1970,
            month: 1,
            day: 1,
            hour: 0,
            minute: 0,
            second: 0,
            isDate: false,
          },
          ICAL.Timezone.localTimezone
        )
      )
    );
    std.addProperty(offsetProperty("tzoffsetfrom", fixed));
    std.addProperty(offsetProperty("tzoffsetto", fixed));
    std.addPropertyWithValue(
      "tzname",
      shortName(timeZone, new Date(Date.UTC(refYear, 0, 1)))
    );
    vtz.addSubcomponent(std);
    return vtz;
  }

  for (const tr of transitions) {
    const isDaylight = tr.to > tr.from;
    const comp = new ICAL.Component(isDaylight ? "daylight" : "standard");
    // Wall-clock of the transition expressed in the *previous* offset.
    const wall = new Date(tr.at + tr.from * MINUTE_MS);
    comp.addProperty(timeProperty("dtstart", anchoredTime(wall)));
    comp.addProperty(offsetProperty("tzoffsetfrom", tr.from));
    comp.addProperty(offsetProperty("tzoffsetto", tr.to));
    comp.addPropertyWithValue("tzname", shortName(timeZone, new Date(tr.at)));
    const { nth, dow } = nthWeekdayOfMonth(wall);
    const rrule = new ICAL.Property("rrule");
    rrule.setValue({
      freq: "YEARLY",
      bymonth: wall.getUTCMonth() + 1,
      byday: `${nth}${dow}`,
    });
    comp.addProperty(rrule);
    vtz.addSubcomponent(comp);
  }
  return vtz;
}

/**
 * Builds an `ICAL.Time` representing `date` as a wall-clock value in `timeZone`,
 * tagged with `TZID=<timeZone>`. Pair with a `VTIMEZONE` from
 * {@link buildVTimezoneComponent} in the same VCALENDAR.
 */
export function zonedTime(date: Date, timeZone: string): ICAL.Time {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(date).map((p) => [p.type, p.value])
  ) as Record<string, string>;
  // A tzid-only timezone tags the value with `TZID=<zone>`; the matching
  // VTIMEZONE in the same VCALENDAR supplies the actual offset.
  const zone = new ICAL.Timezone({ tzid: timeZone });
  return new ICAL.Time(
    {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
      hour: Number(parts.hour),
      minute: Number(parts.minute),
      second: Number(parts.second),
      isDate: false,
    },
    zone
  );
}
