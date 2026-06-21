## Context

FluidCalendar stores calendar event `start`/`end` as `DateTime` columns
(absolute UTC instants). When it pushes an event to a CalDAV server it serializes
them with `ical.js`. The original timed branch used:

```ts
const startTime = ICAL.Time.fromJSDate(event.start, false); // bug
```

`ICAL.Time.fromJSDate(date, useUTC)` reads the JS `Date`'s wall-clock components.
With `useUTC = false` it copies the **local** (server-process timezone)
components and marks the value as floating (no zone). The emitted line is e.g.
`DTSTART:20250619T093000` with no `Z` and no `TZID`. RFC 5545 says a floating
value "is interpreted in the time zone of the ... user agent", so every client
re-anchors it to its own zone, producing the reported N-hour shift.

## Goals / Non-Goals

- Goal: timed events that FluidCalendar writes are interpreted at the correct
  wall-clock time by every CalDAV client regardless of its timezone.
- Goal: recurring timed events keep their intended wall-clock time across DST
  transitions (a fixed-UTC `DTSTART` + `RRULE` would drift by an hour).
- Goal: keep the fix consistent across all properties that encode a timed
  instant (`DTSTART`, `DTEND`, `RECURRENCE-ID`, `EXDATE`).
- Non-Goal: changing all-day serialization (it must remain floating `VALUE=DATE`,
  issue #100).
- Non-Goal: a full IANA timezone database dependency - we derive the needed
  `VTIMEZONE` transitions from the platform's `Intl` data.

## Decision

Serialize timed instants with an **explicit timezone**:

- When the event's timezone is known (from the event input, else the user's
  `UserSettings.timeZone`), emit `DTSTART;TZID=<zone>` / `DTEND;TZID=<zone>` and
  add a matching `VTIMEZONE` subcomponent to the VCALENDAR. The wall-clock value
  is the instant expressed in that zone (`zonedTime`), so clients show the same
  wall-clock time the FluidCalendar UI shows, and recurring events keep that
  wall-clock across DST.
- When no timezone is known, fall back to UTC date-time via
  `ICAL.Time.fromJSDate(date, true)` (trailing `Z`). This is unambiguous and
  correct for single (non-recurring) events; only recurring-across-DST loses the
  wall-clock guarantee, which is acceptable for the no-timezone fallback.

`ical.js` ships no IANA database, so `src/lib/caldav-vtimezone.ts` builds the
`VTIMEZONE` from `Intl.DateTimeFormat` offset lookups: it scans the reference
year day-by-day, binary-searches each offset transition to the minute, and emits
`STANDARD`/`DAYLIGHT` subcomponents with `YEARLY;BYMONTH;BYDAY` rules (or a single
fixed `STANDARD` for zones without DST). `Intl` is used for offsets because it is
exact at transition instants.

### Why TZID + VTIMEZONE (not UTC `Z` alone)

| Option | Single timed event | Recurring across DST | Cost |
| --- | --- | --- | --- |
| floating (old, bug) | wrong in other zones | wrong | - |
| UTC `Z` | correct | drifts 1h after DST | tiny |
| `TZID` + `VTIMEZONE` | correct, shows "home" wall-clock | correct | a VTIMEZONE builder |

UTC `Z` is kept as the fallback when no timezone is available.

### RECURRENCE-ID / EXDATE value-type matching

`RECURRENCE-ID` (single-instance edit) and `EXDATE` (single-instance delete) must
reference the master series' instances using the **same value type** as the
master's `DTSTART`. The exception code now parses the fetched master VEVENT and,
via `buildInstanceReference`, emits a `VALUE=DATE` value for an all-day master and
a date-time value for a timed master. Previously it always emitted a date-time,
so single-instance update/delete of an all-day recurring event could silently
fail to match.

## Risks / Trade-offs

- The generated `VTIMEZONE` covers the reference (current) year's transitions with
  yearly recurrence rules; historical rule changes are not modeled. This matches
  how most clients emit `VTIMEZONE` and is sufficient for correct display.
- A client that previously "happened to be correct" only because it shared the
  server's timezone will now see the true intended instant - the correct behavior.
  Existing events already on the server are not rewritten; only newly
  created/updated events are affected (same as any serialization fix).
- `RECURRENCE-ID`/`EXDATE` for a timed master are emitted in UTC, which is the
  same absolute instant as a `TZID` master `DTSTART`; servers compare instants, so
  this matches. A stricter `TZID`-tagged form is possible later (noted as a todo).

## Migration Plan

None. No schema or API change. The fix takes effect for events created/updated
after deploy.

## Open Questions

None.
