# caldav-event-serialization Specification

## Purpose
TBD - created by archiving change issue-100-caldav-allday-vparam. Update Purpose after archive.
## Requirements
### Requirement: All-day events serialize with a single VALUE=DATE parameter

When FluidCalendar serializes a local calendar event into iCalendar for a CalDAV PUT, an all-day event's `DTSTART` and `DTEND` properties SHALL each carry exactly one `VALUE=DATE` parameter and a date-only value (`YYYYMMDD`), producing RFC 5545-valid output that CalDAV servers (including Baikal and Nextcloud) accept.

The serializer SHALL NOT emit a duplicated `VALUE` parameter (e.g. `VALUE=date;VALUE=DATE`).

#### Scenario: All-day event produces valid DTSTART/DTEND

- **WHEN** an event with `allDay: true` is converted to iCalendar
- **THEN** the output contains `DTSTART;VALUE=DATE:` followed by a `YYYYMMDD` date
- **AND** the output contains `DTEND;VALUE=DATE:` followed by a `YYYYMMDD` date
- **AND** neither `DTSTART` nor `DTEND` contains the `VALUE` parameter more than once

### Requirement: Timed events serialize as DATE-TIME without a VALUE parameter

A timed (non-all-day) event's `DTSTART` and `DTEND` SHALL serialize with an
explicit timezone and SHALL NOT emit a floating local time (no `Z` and no
`TZID`), because a floating value is re-interpreted in each client's own timezone
and shifts the event by the client/server UTC offset. When the event's IANA
timezone is known, the serializer SHALL emit `DTSTART;TZID=<zone>` /
`DTEND;TZID=<zone>` together with a matching `VTIMEZONE` subcomponent in the same
VCALENDAR, so that recurring events keep their wall-clock time across DST
transitions. When no timezone is known, the serializer SHALL fall back to a UTC
date-time (the `YYYYMMDDTHHMMSSZ` form with a trailing `Z`). In all cases the
serialized value SHALL represent the event's stored absolute instant
(`start`/`end`) and SHALL NOT carry a `VALUE` parameter.

#### Scenario: Timed event with a known timezone produces TZID + VTIMEZONE

- **WHEN** an event with `allDay: false` and a known IANA `timeZone` is converted
  to iCalendar
- **THEN** `DTSTART` and `DTEND` carry a `TZID=<zone>` parameter and a time
  component (a `T` between date and time)
- **AND** the VCALENDAR contains a `VTIMEZONE` component whose `TZID` equals that
  zone
- **AND** the `DTSTART` wall-clock equals the event's `start` instant expressed in
  that timezone
- **AND** neither `DTSTART` nor `DTEND` is a floating value (each has either a
  `TZID` or a trailing `Z`)

#### Scenario: Timed event without a timezone falls back to UTC

- **WHEN** an event with `allDay: false` and no known timezone is converted to
  iCalendar
- **THEN** `DTSTART` and `DTEND` end with a `Z` and contain no `TZID` and no
  `VALUE` parameter
- **AND** the encoded `DTSTART` equals the event's `start` instant expressed in
  UTC

#### Scenario: Serialized time is independent of the server process timezone

- **WHEN** the same timed event is converted to iCalendar on a server running in
  UTC and on a server running in a non-UTC zone (e.g. Asia/Shanghai)
- **THEN** both produce the identical `DTSTART`/`DTEND` value

### Requirement: RECURRENCE-ID and EXDATE match the master DTSTART value type

A `RECURRENCE-ID` (single-instance edit) or `EXDATE` (single-instance delete) SHALL be serialized with the same value type as the master series' `DTSTART`, so it matches the master's instances and the server can pair the exception with the correct instance: a `VALUE=DATE` value for an all-day master, and an unambiguous date-time value for a timed master. It SHALL NOT emit a duplicate `VALUE` parameter.

#### Scenario: Single-instance delete of a timed series writes a date-time EXDATE

- **WHEN** a single instance of a timed recurring event is deleted
- **THEN** the emitted `EXDATE` value is an unambiguous date-time (trailing `Z`)
  representing the instance's start instant
- **AND** it carries no `VALUE=DATE` parameter

#### Scenario: Single-instance delete of an all-day series writes a VALUE=DATE EXDATE

- **WHEN** a single instance of an all-day recurring event is deleted
- **THEN** the emitted `EXDATE` value is a `VALUE=DATE` date (`YYYYMMDD`, no `Z`)
- **AND** it contains exactly one `VALUE` parameter

