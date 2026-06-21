## ADDED Requirements

### Requirement: All-day events serialize with a single VALUE=DATE parameter

When FluidCalendar serializes a local calendar event into iCalendar for a CalDAV PUT, an all-day event's `DTSTART` and `DTEND` properties SHALL each carry exactly one `VALUE=DATE` parameter and a date-only value (`YYYYMMDD`), producing RFC 5545-valid output that CalDAV servers (including Baikal and Nextcloud) accept.

The serializer SHALL NOT emit a duplicated `VALUE` parameter (e.g. `VALUE=date;VALUE=DATE`).

#### Scenario: All-day event produces valid DTSTART/DTEND

- **WHEN** an event with `allDay: true` is converted to iCalendar
- **THEN** the output contains `DTSTART;VALUE=DATE:` followed by a `YYYYMMDD` date
- **AND** the output contains `DTEND;VALUE=DATE:` followed by a `YYYYMMDD` date
- **AND** neither `DTSTART` nor `DTEND` contains the `VALUE` parameter more than once

### Requirement: Timed events serialize as DATE-TIME without a VALUE parameter

When FluidCalendar serializes a timed (non-all-day) event, its `DTSTART` and `DTEND` SHALL be date-time values and SHALL NOT carry a `VALUE` parameter, preserving the existing behavior that already works against CalDAV servers.

#### Scenario: Timed event produces date-time DTSTART/DTEND

- **WHEN** an event with `allDay: false` is converted to iCalendar
- **THEN** the `DTSTART` and `DTEND` lines contain a time component (a `T` between date and time)
- **AND** neither `DTSTART` nor `DTEND` contains a `VALUE` parameter
