## Why

FluidCalendar can sync tasks from Outlook and Google Tasks, but not from CalDAV servers (Baikal, Nextcloud, Fastmail, etc.), even though those servers expose tasks as iCalendar `VTODO` components and FluidCalendar already syncs CalDAV *calendar events* (`VEVENT`). Users have asked to import their CalDAV tasks (GitHub issue #144, "Import tasks from caldav", with a second user confirming it is their only outstanding complaint).

The task-sync framework was designed for this: `TaskProvider.type` already documents `'caldav'`, the create-provider API schema already accepts `"CALDAV"`, and `TaskSyncManager.getProvider` carries a commented-out `case "CALDAV"` placeholder. The only thing missing is the CalDAV task provider itself.

## What Changes

- Add a `CalDAVTaskProvider` implementing `TaskProviderInterface` that:
  - discovers CalDAV collections that support `VTODO` (task lists) via the existing `tsdav` client,
  - reads `VTODO` items from a collection and maps them to FluidCalendar tasks (title, description, due/start dates, status, priority, recurrence), reusing the existing `ical.js` parsing and RRULE conversion helpers.
- Add a `convertVTodoToTask` helper (alongside the existing `convertVEventToCalendarEvent`) that parses a `VTODO` `ICAL.Component` into the provider's external-task shape.
- Wire `"CALDAV"` into `TaskSyncManager.getProvider` and the provider-lists API route so a connected CalDAV account can list and map its task collections.
- Scope this change to **one-way import (incoming)**: the issue asks to *import* tasks. `getTaskLists`/`getTasks`/`validateConnection`/mapping are fully implemented; the write methods (`createTask`/`updateTask`/`deleteTask`) throw an explicit "not supported" error so the bidirectional engine's incoming path works while outgoing CalDAV write-back is deferred (a future change).
- Add unit coverage for `VTODO` → task conversion (dates, status, priority, recurrence, all-day) and for the provider's list/task reads against a mocked CalDAV client.

## Capabilities

### New Capabilities
- `caldav-task-import`: How FluidCalendar imports tasks (`VTODO`) from a connected CalDAV account into local projects, including task-collection discovery and `VTODO` → task field mapping.

### Modified Capabilities
<!-- None: no existing spec covers CalDAV task import. -->

## Impact

- New code: `src/lib/task-sync/providers/caldav-provider.ts`, `src/lib/task-sync/providers/caldav-field-mapper.ts`, and a `convertVTodoToTask` helper in `src/lib/caldav-helpers.ts`.
- Wiring: `src/lib/task-sync/task-sync-manager.ts` (`getProvider`, `getFieldMapper`) and `src/app/api/task-sync/providers/[id]/lists/route.ts` gain a `CALDAV` branch.
- No schema changes (the `TaskProvider`/`TaskListMapping`/`Task` models and the `CALDAV` provider type already exist). No new dependencies (`tsdav` + `ical.js` are already used for CalDAV calendar sync).
- Open-source / core feature (task-sync has no SAAS split). Risk is confined to the new CalDAV task path; existing Outlook/Google task sync and CalDAV calendar sync are untouched.
