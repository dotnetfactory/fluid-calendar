## Context

FluidCalendar's task-sync framework (`src/lib/task-sync/`) is provider-agnostic: `TaskSyncManager` orchestrates sync against any `TaskProviderInterface`, and providers already exist for Outlook and Google Tasks. CalDAV was always intended as a third provider (commented-out `case "CALDAV"` in `getProvider`, `CALDAV` already accepted by the create-provider Zod schema and documented on `TaskProvider.type`).

Separately, `src/lib/caldav-calendar.ts` already talks to CalDAV servers via `tsdav` for *calendar events* (`VEVENT`), and `src/lib/caldav-helpers.ts` already parses iCalendar and converts RRULE with `ical.js`. A CalDAV account is stored as a `ConnectedAccount` (`provider: "CALDAV"`, `caldavUrl`, `caldavUsername`, `accessToken` as the password).

This change adds the missing CalDAV task provider, scoped to **one-way import** (the issue asks to "import tasks").

## Goals / Non-Goals

**Goals**
- Discover CalDAV collections that advertise `VTODO` support and expose them as task lists.
- Read `VTODO` items from a chosen collection and map them to FluidCalendar tasks (title, description, due/start dates, status, priority, recurrence, all-day).
- Plug into the existing `TaskSyncManager` incoming-sync path with no schema changes.

**Non-Goals**
- Write-back to CalDAV (creating/updating/deleting `VTODO` on the server). The write methods are present but throw an explicit "not supported" error; outgoing sync is a future change.
- A new "connect CalDAV account" UI flow (CalDAV accounts already exist for calendar sync and are reused here).
- Delta/sync-token-based task fetch (we read the whole collection each sync, like the Google provider).

## Decisions

### 1. One-way import via the existing interface, write methods stubbed
`CalDAVTaskProvider implements TaskProviderInterface` fully for the read path (`getTaskLists`, `getTasks`, `validateConnection`, `mapToInternalTask`, `mapToExternalTask`, `getChanges`). `createTask`/`updateTask`/`deleteTask` throw `Error("CalDAV task write-back is not supported")`.

- **Why:** The issue's verb is "import". The bidirectional engine only calls the write methods when there are local-origin changes to push out; for an `incoming` mapping with externally-sourced tasks, the incoming path (create/update local tasks from external) is exercised and the write methods are not. Throwing (rather than silently no-op'ing) makes the unsupported direction explicit and surfaces clearly if a future caller wires outgoing sync before it's implemented.
- **Alternative considered:** Full bidirectional VTODO write-back. Rejected for this change: large surface (RRULE round-trip, ETag/If-Match concurrency, conflict resolution, status round-trip) and higher blast radius than the issue asks for. Deferred to a follow-up.

### 2. Task-collection discovery reuses `tsdav` `fetchCalendars`, filtered by `components`
`getTaskLists()` calls the same `createDAVClient(...).fetchCalendars()` the calendar service uses, then keeps only calendars whose `components` array includes `"VTODO"`. Each becomes an `ExternalTaskList { id: <calendar url>, name: <displayName>, path: <url>, color: <calendarColor> }`.

- **Why:** RFC 4791 calendars advertise their supported component set via `supported-calendar-component-set`, which `tsdav` surfaces as `DAVCalendar.components`. A collection that does not list `VTODO` cannot hold tasks. Using the calendar `url` as the list id matches how the calendar service addresses collections (`calendarPath`) and is what `getTasks` needs to query.
- **Robustness:** if `components` is absent (some servers omit it), the collection is excluded from the task list (we only surface collections that explicitly support tasks), avoiding noise from event-only calendars.

### 3. VTODO fetch mirrors the existing `calendarQuery` path, with a `VTODO` comp-filter and no time-range
`getTasks(listId)` builds a `CalendarQueryParams` identical in shape to `createCalDAVQueryParams` but with the inner `comp-filter` `name: "VTODO"` and **no** `time-range` (tasks are not time-bounded like events; we want all of them, including undated and completed-but-recent ones). It then reuses the same data-extraction approach (`calendar-data` prop, string / `_cdata` handling) and parses with `ical.js`, taking `getAllSubcomponents("vtodo")`.

- **Why no time-range:** A `time-range` filter on `VTODO` is defined against `DTSTART`/`DUE`/`DURATION`/`COMPLETED`; many tasks have none of those, and a strict filter would drop undated tasks. Importing the whole collection is correct for "import my tasks" and matches the Google provider (which fetches all tasks in a list).
- The extraction helpers in `caldav-calendar.ts` are private; rather than widen that class's surface, the small `extractICalData`-style logic is reimplemented locally in the provider (a few lines) to keep the calendar service untouched. The shared, reusable part - parsing a single `VTODO` component into task fields - lives in `caldav-helpers.ts` as `convertVTodoToTask`, mirroring `convertVEventToCalendarEvent`.

### 4. `convertVTodoToTask` in `caldav-helpers.ts`
A new exported helper parses one `VTODO` `ICAL.Component` into the `ExternalTask` shape:
- `UID` → `id` (skip the VTODO if absent; UID is required for stable linking).
- `SUMMARY` → `title` (fallback `"Untitled Task"`).
- `DESCRIPTION` → `description`.
- `DUE` → `dueDate`; `DTSTART` → `startDate` (both via `ICAL.Time.toJSDate()`; all-day `VALUE=DATE` values are handled by `ical.js`).
- `COMPLETED` → `completedDate`.
- `STATUS` → mapped: `COMPLETED` → completed, everything else (`NEEDS-ACTION`, `IN-PROCESS`, `CANCELLED`, absent) → todo (status enum lives in `@/types/task`; the field mapper does the enum mapping so the helper returns the raw VTODO status string).
- `RRULE` → `recurrenceRule` via the existing `convertICalRRuleToRRuleString`; sets `isRecurring`.
- `PRIORITY` (0-9) → carried through for the field mapper to bucket into FluidCalendar's high/medium/low.
- `LAST-MODIFIED` (or `DTSTAMP` fallback) → `lastModified` for the sync engine's conflict timestamps.

### 5. Field mapping: external-owned vs local-owned
A `CalDAVFieldMapper extends FieldMapper` follows the existing selective-sync model: external-owned (overwritten each sync) = title, description, status, due date, recurrence; local-owned (preserved) = startDate is treated as external for CalDAV only if `DTSTART` is present, otherwise preserved; duration, priority bucket override, energyLevel, preferredTime, auto-scheduling stay local. `mapToInternalTask` converts VTODO status/priority to FluidCalendar's `TaskStatus`/`Priority`; `mapToExternalTask` is only needed by the (unsupported) write path and maps minimally.

- The base `FieldMapper` default behavior is already a reasonable selective-sync baseline; the CalDAV mapper exists primarily to translate VTODO `STATUS`/`PRIORITY` enums. Keeping it small avoids drift from the Outlook/Google mappers.

### 6. Wiring
- `TaskSyncManager.getProvider`: add `case "CALDAV"` that loads the provider's `ConnectedAccount` and constructs `new CalDAVTaskProvider(account)`.
- `TaskSyncManager.getFieldMapper`: add `case "CALDAV"` returning `new CalDAVFieldMapper()`.
- `src/app/api/task-sync/providers/[id]/lists/route.ts`: add a `CALDAV` branch constructing the provider so the UI can list task collections.

## Risks / Trade-offs

- **Server variation:** CalDAV servers differ in how they expose `supported-calendar-component-set` and `VTODO` semantics. Mitigated by filtering on `components` and tolerant parsing (skip malformed VTODOs, log and continue), matching the calendar service's defensive style.
- **Whole-collection reads:** No delta sync means each sync re-reads all VTODOs. Acceptable (same as Google Tasks provider) and bounded by typical task-list sizes; a sync-token optimization can come later.
- **One-way only:** A user editing an imported task in FluidCalendar will not push the change back to CalDAV. This matches the issue scope ("import") and the `incoming` default direction; documented in the PR and CHANGELOG.

## Migration Plan

No data migration. The `CALDAV` provider type, schema, and create-provider API already exist; this purely adds the provider implementation and three small wiring points. Existing Outlook/Google task sync and CalDAV calendar sync are unaffected.
