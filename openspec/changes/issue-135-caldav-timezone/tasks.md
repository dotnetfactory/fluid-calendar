# Tasks

## 1. VTIMEZONE generator (TDD)

- [x] 1.1 Add `src/lib/caldav-vtimezone.ts` building an RFC 5545 `VTIMEZONE` from
  `Intl` timezone data (STANDARD/DAYLIGHT transitions + yearly RRULE), plus a
  `zonedTime` helper that tags an instant with `TZID`.
- [x] 1.2 Unit tests proving the generator is correct across DST boundaries and
  hemispheres (NY, Shanghai no-DST, Kolkata, Sydney), and returns null for an
  invalid zone.

## 2. Serializer fix (TDD)

- [x] 2.1 Tests: timed events with a known timezone emit `DTSTART;TZID` + a
  matching VTIMEZONE; a recurring event keeps its wall-clock time across a DST
  transition; no-timezone falls back to UTC `Z`; invalid timezone falls back to
  UTC; all-day events stay `VALUE=DATE` with no VTIMEZONE.
- [x] 2.2 In `convertToICalendar`, serialize the timed branch with `TZID` +
  VTIMEZONE when a timezone is available, else UTC `Z`.
- [x] 2.3 Add optional `timeZone` to `CalendarEventInput`; resolve it from the
  event input or `UserSettings.timeZone` in `createEvent`/`updateEvent`.

## 3. RECURRENCE-ID / EXDATE value-type matching (TDD)

- [x] 3.1 Tests (driven through real `deleteEvent` with prisma/fetch mocked):
  timed master -> date-time EXDATE (`...Z`); all-day master -> floating
  `VALUE=DATE` EXDATE with exactly one VALUE parameter.
- [x] 3.2 Extract `buildInstanceReference` that reads the master DTSTART's value
  type and emits a matching RECURRENCE-ID/EXDATE; use it in
  `updateEvent`/`deleteEvent`.

## 4. Verify

- [x] 4.1 New tests green.
- [x] 4.2 `npm run type-check` clean.
- [x] 4.3 `npm run lint` clean.
- [x] 4.4 Update `CHANGELOG.md` under `[Unreleased] > Fixed`.
