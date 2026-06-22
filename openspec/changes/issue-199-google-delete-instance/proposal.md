## Why

Deleting a **single occurrence** of a recurring Google Calendar event removes the wrong instance. `deleteGoogleEvent(..., "single")` ignores the occurrence the user clicked and instead re-queries Google for the **next upcoming instance** (`timeMin: now`, `maxResults: 1`) and deletes that. Deleting a past or non-next row can silently delete a *different* (often future) occurrence - surprising behavior and data loss. The clicked occurrence id is already supplied to the function, so the re-query is both wrong and unnecessary. The bug affects all calendar views (Day, Week, Month, Year, Agenda) and the task-block push path.

## What Changes

- In single-occurrence mode, `deleteGoogleEvent` deletes the **provided `eventId`** directly (it already identifies the clicked instance) instead of querying `events.instances({ timeMin: now, maxResults: 1 })` and deleting whatever comes back.
- Remove the now-dead "next upcoming instance" lookup from the single-mode delete path.
- Add a small test seam so `deleteGoogleEvent` can be unit-tested with a mocked Google client (it currently resolves `getGoogleCalendarClient` via a same-module reference that can't be mocked).
- Add a mocked regression test asserting the **clicked occurrence id** is the one passed to `events.delete`, and that the single-mode path no longer calls `events.instances`.

No API surface, route, or caller signature changes; `deleteGoogleEvent`'s exported signature is unchanged. Series-mode deletion is unchanged.

## Capabilities

### New Capabilities
- `google-event-deletion`: How FluidCalendar deletes Google Calendar events - single-occurrence deletes target the exact clicked instance, and series deletes remove the whole recurring series.

### Modified Capabilities
<!-- None: no existing spec defines this behavior. -->

## Impact

- `src/lib/google-calendar.ts` - `deleteGoogleEvent` single-mode branch (and a testable seam for the calendar-client getter).
- Behavior reached by `src/app/api/calendar/google/events/route.ts` (DELETE) and `src/lib/task-block-push.ts` (task-block single-mode deletes). No signature changes to either caller.
- New unit test file under `src/__tests__/`.
- `CHANGELOG.md` (`[unreleased]`) - user-facing bug fix.
