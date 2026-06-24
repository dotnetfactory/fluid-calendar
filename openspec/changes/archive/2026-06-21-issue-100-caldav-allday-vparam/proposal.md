## Why

Creating or updating an **all-day** event on a CalDAV server (Baikal, Nextcloud) fails with a server error, while timed events work fine (GitHub issue #100, confirmed by three users). The all-day branch of our iCalendar serializer emits an invalid `DTSTART;VALUE=date;VALUE=DATE:...` property with the `VALUE` parameter specified twice, which RFC-5545-strict servers reject.

## What Changes

- Fix `CalDAVCalendarService.convertToICalendar` so all-day events serialize `DTSTART`/`DTEND` with a single `VALUE=DATE` parameter instead of the duplicated `VALUE=date;VALUE=DATE`.
- Stop manually calling `setParameter("value", "date")` on the `dtstart`/`dtend` properties; rely on the `ICAL.Time` date value (which already carries `isDate=true`) to emit the parameter exactly once.
- Add unit coverage proving the generated iCalendar for an all-day event contains exactly one `VALUE=DATE` parameter on `DTSTART`/`DTEND`, and that timed-event serialization is unchanged.

## Capabilities

### New Capabilities
- `caldav-event-serialization`: How FluidCalendar serializes local calendar events into RFC 5545 iCalendar for CalDAV PUT requests, including the distinction between all-day (DATE) and timed (DATE-TIME) events.

### Modified Capabilities
<!-- None: no existing spec covers CalDAV serialization behavior. -->

## Impact

- Code: `src/lib/caldav-calendar.ts` (`convertToICalendar`, all-day branch). The same method backs both `createEvent` and `updateEvent`, so the fix resolves both the "create" symptom in the issue body and the "update" symptom in the comments.
- No API, schema, or dependency changes. Risk is confined to all-day CalDAV event serialization.
