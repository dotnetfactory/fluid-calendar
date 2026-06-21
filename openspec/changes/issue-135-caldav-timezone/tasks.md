# Tasks

## 1. Tests (TDD - red first)

- [x] 1.1 Add a unit test asserting `convertToICalendar` emits a UTC `DTSTART`/`DTEND`
  (trailing `Z`, no `TZID`, no `VALUE` param) for a timed event, and that the
  emitted instant equals the input UTC instant.
- [x] 1.2 Add a DST-spanning case (e.g. a summer and a winter instant) proving the
  serialized UTC time is correct in both, independent of server timezone.
- [x] 1.3 Add a regression case proving all-day events are unchanged
  (`VALUE=DATE`, `YYYYMMDD`, no `Z`).
- [x] 1.4 Add cases proving `RECURRENCE-ID` (single-instance update) and `EXDATE`
  (single-instance delete) are emitted in UTC with a `Z` designator.

## 2. Fix

- [x] 2.1 In `convertToICalendar`, change the timed branch to
  `ICAL.Time.fromJSDate(date, true)` for `DTSTART` and `DTEND`.
- [x] 2.2 In `updateEvent`, change the `RECURRENCE-ID` value to
  `ICAL.Time.fromJSDate(event.start, true)`.
- [x] 2.3 In `deleteEvent`, change the `EXDATE` value to
  `ICAL.Time.fromJSDate(event.start, true)`.

## 3. Verify

- [x] 3.1 Run the new tests green.
- [x] 3.2 `npm run type-check` clean.
- [x] 3.3 `npm run lint` clean.
- [x] 3.4 Update `CHANGELOG.md` under `[Unreleased] > Fixed`.
