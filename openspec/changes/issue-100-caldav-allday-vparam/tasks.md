## 1. Tests (red)

- [x] 1.1 Add a unit test asserting `convertToICalendar` for an all-day event emits exactly one `VALUE=DATE` on `DTSTART` and `DTEND` and no `VALUE=date;VALUE=DATE` duplication
- [x] 1.2 Add a unit test asserting a timed event still serializes `DTSTART`/`DTEND` as date-time with no `VALUE` parameter (regression guard)

## 2. Fix (green)

- [x] 2.1 In `src/lib/caldav-calendar.ts` `convertToICalendar`, remove the manual `setParameter("value", "date")` calls for the all-day branch and rely on the date-typed `ICAL.Time` value to emit `VALUE=DATE` once
- [x] 2.2 Run the new tests and confirm they pass

## 3. Gate

- [x] 3.1 `npm run test:unit` (new tests green; pre-existing `google-*` failures ignored)
- [x] 3.2 `npm run type-check` clean
- [x] 3.3 `npm run lint` clean
- [x] 3.4 Update `CHANGELOG.md` under `[unreleased]`
