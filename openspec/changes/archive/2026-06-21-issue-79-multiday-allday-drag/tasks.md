## 1. Shared selection helper (TDD)

- [x] 1.1 Write failing unit tests for `getSelectionRange` covering: multi-day all-day drag returns inclusive last day; single-day all-day returns start == end; timed selection returns unchanged start/end with allDay false; defensive end-before-start clamp
- [x] 1.2 Implement `src/lib/calendar-selection.ts` with `getSelectionRange` to make the tests pass

## 2. Wire helper into views

- [x] 2.1 Use `getSelectionRange` in `MonthView` `handleDateSelect`
- [x] 2.2 Use `getSelectionRange` in `WeekView` `handleDateSelect`
- [x] 2.3 Use `getSelectionRange` in `DayView` `handleDateSelect`
- [x] 2.4 Use `getSelectionRange` in `MultiMonthView` `handleDateSelect`

## 3. Verify + document

- [x] 3.1 Local gate green: `npm run test:unit`, `npm run type-check`, `npm run lint`
- [x] 3.2 Add a `CHANGELOG.md` entry under `[unreleased]`
