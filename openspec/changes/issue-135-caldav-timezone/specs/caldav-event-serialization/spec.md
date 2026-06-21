## MODIFIED Requirements

### Requirement: Timed events serialize as DATE-TIME without a VALUE parameter

A timed (non-all-day) event's `DTSTART` and `DTEND` SHALL serialize as UTC date-time values (the `YYYYMMDDTHHMMSSZ` form with a trailing `Z` designator) and SHALL NOT carry a `VALUE` parameter. The serializer SHALL NOT emit a floating local time (no `Z` and no `TZID`), because a floating value is re-interpreted in each client's own timezone and shifts the event by the client/server UTC offset. The serialized instant SHALL equal the event's stored absolute instant (`start`/`end`), independent of the timezone of the server process performing the serialization.

#### Scenario: Timed event produces a UTC date-time DTSTART/DTEND

- **WHEN** an event with `allDay: false` is converted to iCalendar
- **THEN** the `DTSTART` and `DTEND` lines contain a time component (a `T` between date and time) and end with a `Z`
- **AND** neither `DTSTART` nor `DTEND` contains a `VALUE` parameter
- **AND** neither `DTSTART` nor `DTEND` contains a `TZID` parameter
- **AND** the encoded `DTSTART` equals the event's `start` instant expressed in UTC

#### Scenario: Serialized time is independent of the server timezone

- **WHEN** the same timed event is converted to iCalendar on a server running in UTC and on a server running in a non-UTC zone (e.g. Asia/Shanghai)
- **THEN** both produce the identical `DTSTART`/`DTEND` UTC value with a `Z` designator

## ADDED Requirements

### Requirement: RECURRENCE-ID and EXDATE encode the absolute instant in UTC

A `RECURRENCE-ID` (editing a single instance of a recurring series) or an `EXDATE` (deleting a single instance) SHALL be serialized as a UTC date-time (`YYYYMMDDTHHMMSSZ`) representing the instance's absolute start instant, not a floating local time, so it matches the master series' instances regardless of client timezone.

#### Scenario: Single-instance update writes a UTC RECURRENCE-ID

- **WHEN** a single instance of a recurring event is updated
- **THEN** the emitted `RECURRENCE-ID` value ends with a `Z` and equals the instance start instant in UTC

#### Scenario: Single-instance delete writes a UTC EXDATE

- **WHEN** a single instance of a recurring event is deleted
- **THEN** the emitted `EXDATE` value ends with a `Z` and equals the instance start instant in UTC
