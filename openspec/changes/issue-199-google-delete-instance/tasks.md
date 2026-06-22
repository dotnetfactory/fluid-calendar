## 1. Test seam + failing regression test

- [x] 1.1 Add an optional injected calendar-client seam to `deleteGoogleEvent` (default = real `getGoogleCalendarClient`) so it can be unit-tested with a mocked Google client.
- [x] 1.2 Write `src/__tests__/google-calendar-delete.test.ts` with a fake `calendar` client (`events.get/delete/instances` jest mocks). Add a failing test asserting single-mode delete calls `events.delete` with the exact clicked `eventId` and does NOT call `events.instances`.

## 2. Fix single-mode deletion

- [x] 2.1 In `deleteGoogleEvent`, change single mode to call `events.delete({ calendarId, eventId })` directly; remove the `events.instances({ timeMin: now, maxResults: 1 })` lookup and the redundant fallback delete.
- [x] 2.2 Confirm the new test passes (clicked id deleted, no `events.instances`).

## 3. Cover remaining scenarios + gate

- [x] 3.1 Add tests: series mode deletes the master `recurringEventId`; non-recurring single-mode delete uses the provided id without an instances lookup.
- [x] 3.2 Run the local gate: new test green, `npm run type-check` clean, `npm run lint` clean.
- [x] 3.3 Update `CHANGELOG.md` under `[unreleased]` with the user-facing bug fix.
