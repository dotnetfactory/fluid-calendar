## Context

FluidCalendar stores calendar event `start`/`end` as `DateTime` columns
(absolute UTC instants). When it pushes an event to a CalDAV server it serializes
them with `ical.js`:

```ts
const startTime = ICAL.Time.fromJSDate(event.start, false); // bug
```

`ICAL.Time.fromJSDate(date, useUTC)` reads the JS `Date`'s wall-clock components.
With `useUTC = false` it copies the **local** (server-process timezone)
components and marks the value as floating (no zone). The emitted line is e.g.
`DTSTART:20250619T053000` (server in America/New_York) or
`DTSTART:20250619T093000` (server in UTC) - in both cases with no `Z` and no
`TZID`. RFC 5545 says a floating value "is interpreted in the time zone of the
... user agent", so every client re-anchors it to its own zone, producing the
reported N-hour shift.

## Goals / Non-Goals

- Goal: timed events that FluidCalendar writes are interpreted at the same
  absolute instant by every CalDAV client regardless of its timezone.
- Goal: keep the fix minimal and consistent across all properties that encode a
  timed instant (`DTSTART`, `DTEND`, `RECURRENCE-ID`, `EXDATE`).
- Non-Goal: per-event `TZID` + embedded `VTIMEZONE`. The issue suggests this, but
  it requires storing each event's intended display timezone (the schema has no
  such column) and bundling timezone definitions. UTC with a `Z` designator is
  equally unambiguous, is what the stored instant already represents, and is the
  smallest correct change.
- Non-Goal: changing all-day serialization (it must remain floating `VALUE=DATE`).

## Decision

Convert all timed instants with `ICAL.Time.fromJSDate(date, true)` so `ical.js`
emits UTC date-time values with a trailing `Z`:

- `DTSTART` / `DTEND` in `convertToICalendar` (timed branch).
- `RECURRENCE-ID` in `updateEvent` (single-instance edit).
- `EXDATE` in `deleteEvent` (single-instance delete).

`fromJSDate(date, true)` yields the UTC wall-clock of the same instant, so the
output is independent of the server-process timezone - the fix works whether the
container runs in UTC, Asia/Shanghai, or America/New_York, which is why the
existing `TZ=...` workaround becomes unnecessary.

### Why UTC `Z` and not `TZID=...`

| Option | Result | Cost |
| --- | --- | --- |
| `Z` (UTC) | unambiguous absolute instant, correct in all clients | one-arg change, no new data |
| `TZID=Asia/...` + `VTIMEZONE` | also correct, shows event in its "home" zone | needs a stored per-event timezone + VTIMEZONE emission; not available |

The stored value is already a UTC instant, so `Z` is the faithful representation.

## Risks / Trade-offs

- A client that previously "happened to be correct" only because both server and
  client ran the same timezone as the floating value will now see the true UTC
  instant - which is the correct behavior and matches what FluidCalendar's own UI
  shows. Existing events already on the server are not rewritten by this change;
  only newly created/updated events are affected (acceptable - same as any
  serialization fix).
- `RECURRENCE-ID`/`EXDATE` previously floating could fail to match server-side
  master instances in non-UTC clients; emitting UTC makes them match the
  (now UTC) `DTSTART` of the series. Low risk, strictly more correct.

## Migration Plan

None. No schema or API change. The fix takes effect for events created/updated
after deploy.

## Open Questions

None.
