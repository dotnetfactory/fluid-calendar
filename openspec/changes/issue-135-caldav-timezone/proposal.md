## Why

Events created or updated by FluidCalendar on a CalDAV server are shifted by the
server's UTC offset when viewed in other clients (Thunderbird, Home Assistant)
that are in a different timezone (GitHub issue #135, confirmed by users in
Asia/Shanghai and America/New_York).

The timed-event branch of our iCalendar serializer emitted a **floating-time**
`DTSTART`/`DTEND` - e.g. `DTSTART:20250619T093000` with no `Z` UTC designator
and no `TZID` parameter. Per RFC 5545, a floating value is interpreted in each
client's own local timezone, so the same event renders at a different wall-clock
time depending on where it is opened. Users found a fragile workaround (forcing
the container's `TZ`), but it does not help collaborators in other timezones and
silently fails when the image lacks `tzdata`.

A timed instant must be serialized unambiguously. Two encodings are unambiguous:
UTC with a trailing `Z`, or a wall-clock value tagged with `TZID=<zone>` plus a
matching `VTIMEZONE`. UTC `Z` is the smaller change, but for **recurring** events
it drifts: `DTSTART:...Z` + `RRULE` keeps a fixed UTC instant, so after a DST
transition the event shifts by an hour in the user's local time. `TZID` keeps the
intended wall-clock time across DST. We therefore serialize timed events with a
`TZID` + `VTIMEZONE` when the user's timezone is known, and fall back to UTC `Z`
when it is not.

The same value-type defect exists in the `RECURRENCE-ID` (single-instance update)
and `EXDATE` (single-instance delete) properties, which must reference the master
series' instances using the same value **type** the master's `DTSTART` uses.

## What Changes

- Serialize timed (non-all-day) `DTSTART`/`DTEND` in `convertToICalendar` with an
  explicit timezone: when a user IANA timezone is available, emit
  `DTSTART;TZID=<zone>` / `DTEND;TZID=<zone>` plus a matching `VTIMEZONE`
  subcomponent; otherwise fall back to UTC date-time (`YYYYMMDDTHHMMSSZ`). Never
  emit floating local time.
- Add `src/lib/caldav-vtimezone.ts` to build an RFC 5545 `VTIMEZONE` (with
  `STANDARD`/`DAYLIGHT` transitions derived from the system `Intl` timezone data)
  and `TZID`-tagged date-times, since `ical.js` ships no IANA database.
- Resolve the event's timezone in `createEvent`/`updateEvent` from the event
  input, falling back to the user's `UserSettings.timeZone`.
- Make `RECURRENCE-ID` (single-instance update) and `EXDATE` (single-instance
  delete) match the master `DTSTART`'s value type: a `VALUE=DATE` value for an
  all-day master, an unambiguous date-time for a timed master.
- Leave the all-day branch unchanged: all-day events MUST stay as floating
  `VALUE=DATE` values (`YYYYMMDD`) per RFC 5545 and the fix from issue #100.
- Add unit coverage proving timed events serialize with a `TZID` + `VTIMEZONE`
  (and fall back to UTC when no timezone is set), that all-day serialization is
  unchanged, and that single-instance `EXDATE` matches the master value type.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `caldav-event-serialization`: tighten the "timed events serialize as DATE-TIME"
  requirement so timed `DTSTART`/`DTEND` are emitted with an explicit timezone
  (`TZID` + `VTIMEZONE`, or UTC `Z` fallback) rather than floating local time,
  and extend it to the `RECURRENCE-ID` and `EXDATE` properties.

## Impact

- Code: new `src/lib/caldav-vtimezone.ts`; `src/lib/caldav-calendar.ts`
  (`convertToICalendar` timed branch; timezone resolution in
  `createEvent`/`updateEvent`; the `RECURRENCE-ID` property in `updateEvent` and
  the `EXDATE` property in `deleteEvent`); `src/lib/caldav-interfaces.ts` (adds
  optional `timeZone` to `CalendarEventInput`).
- No schema or dependency changes. Risk is confined to timed CalDAV event
  serialization; all-day handling is untouched.
