## Why

Events created or updated by FluidCalendar on a CalDAV server are shifted by the
server's UTC offset when viewed in other clients (Thunderbird, Home Assistant)
that are in a different timezone (GitHub issue #135, confirmed by users in
Asia/Shanghai and America/New_York).

The timed-event branch of our iCalendar serializer emits a **floating-time**
`DTSTART`/`DTEND` - e.g. `DTSTART:20250619T093000` with no `Z` UTC designator
and no `TZID` parameter. Per RFC 5545, a floating value is interpreted in each
client's own local timezone, so the same event renders at a different wall-clock
time depending on where it is opened. The internally stored `start`/`end` are
absolute UTC instants (`Date` objects), so the correct, unambiguous serialization
is UTC with a trailing `Z`. The same floating-time defect exists in the
`RECURRENCE-ID` (single-instance update) and `EXDATE` (single-instance delete)
properties, which must reference the master series' instances by the same
absolute instant.

## What Changes

- Fix `CalDAVCalendarService.convertToICalendar` so timed (non-all-day) events
  serialize `DTSTART`/`DTEND` as UTC date-time values (`YYYYMMDDTHHMMSSZ`)
  instead of floating local time, by converting the JS `Date` with
  `ICAL.Time.fromJSDate(date, true)` (UTC) rather than `false` (floating).
- Apply the same UTC conversion to the `RECURRENCE-ID` property used when editing
  a single instance of a recurring series, and to the `EXDATE` property used when
  deleting a single instance, so they reference the correct absolute instant.
- Leave the all-day branch unchanged: all-day events MUST stay as floating
  `VALUE=DATE` values (`YYYYMMDD`) per RFC 5545 and the fix from issue #100.
- Add unit coverage proving timed `DTSTART`/`DTEND` carry a `Z` designator and
  represent the correct UTC instant across DST and non-UTC server timezones, and
  that all-day serialization is unchanged.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `caldav-event-serialization`: tighten the "timed events serialize as DATE-TIME"
  requirement so timed `DTSTART`/`DTEND` are emitted in UTC with a `Z` designator
  (unambiguous absolute time) rather than floating local time, and extend it to
  the `RECURRENCE-ID` and `EXDATE` properties.

## Impact

- Code: `src/lib/caldav-calendar.ts` - `convertToICalendar` (timed branch, backs
  both `createEvent` and `updateEvent`), the `RECURRENCE-ID` property in
  `updateEvent` (single-instance), and the `EXDATE` property in `deleteEvent`
  (single-instance).
- No API, schema, or dependency changes. Risk is confined to timed CalDAV event
  serialization; all-day handling is untouched.
