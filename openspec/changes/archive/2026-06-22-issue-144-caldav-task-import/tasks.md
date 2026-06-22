## 1. VTODO parsing helper (TDD)

- [x] 1.1 Add a unit test for `convertVTodoToTask` in `caldav-helpers.ts`: a `VTODO` with `UID`/`SUMMARY`/`DESCRIPTION`/`DUE`/`STATUS:COMPLETED` maps to an external task with matching id, title, description, due date, and a completed-status marker
- [x] 1.2 Add a unit test: a `VTODO` with `RRULE:FREQ=WEEKLY` produces `isRecurring: true` and a recurrence rule string containing `FREQ=WEEKLY`
- [x] 1.3 Add a unit test: a `VTODO` with no `UID` returns null/undefined (caller skips it); a `VTODO` with no `SUMMARY` gets a non-empty placeholder title
- [x] 1.4 Implement `convertVTodoToTask(vtodo: ICAL.Component)` in `src/lib/caldav-helpers.ts`, reusing `convertICalRRuleToRRuleString`; tests pass

## 2. CalDAVTaskProvider (TDD)

- [x] 2.1 Add a unit test for `getTaskLists()` with a mocked CalDAV client: only collections whose `components` include `VTODO` are returned; id = collection url, name = displayName
- [x] 2.2 Add a unit test for `getTasks(listId)` with a mocked client returning a calendar-query response carrying two `VTODO` objects: returns two external tasks with ids = UIDs; a malformed/UID-less VTODO is skipped
- [x] 2.3 Add a unit test asserting `createTask`/`updateTask`/`deleteTask` throw a "not supported" error
- [x] 2.4 Implement `CalDAVTaskProvider implements TaskProviderInterface` in `src/lib/task-sync/providers/caldav-provider.ts` (read path via `tsdav` `fetchCalendars` + `calendarQuery` with a `VTODO` comp-filter; reuse `convertVTodoToTask`); write methods throw; tests pass

## 3. Field mapper

- [x] 3.1 Add a unit test for `CalDAVFieldMapper.mapToInternalTask`: VTODO status/priority map to FluidCalendar `TaskStatus`/`Priority`; due/start dates and recurrence carry through
- [x] 3.2 Implement `CalDAVFieldMapper extends FieldMapper` in `src/lib/task-sync/providers/caldav-field-mapper.ts`; tests pass

## 4. Wiring

- [x] 4.1 Add `case "CALDAV"` to `TaskSyncManager.getProvider` (load `ConnectedAccount`, construct `CalDAVTaskProvider`) and to `getFieldMapper` (return `CalDAVFieldMapper`); uncomment/replace the placeholder import
- [x] 4.2 Add a `CALDAV` branch to `src/app/api/task-sync/providers/[id]/lists/route.ts` so the UI can list CalDAV task collections

## 5. Gate

- [x] 5.1 `npm run test:unit` (new tests green; pre-existing `google-*` timezone suites ignored)
- [x] 5.2 `npm run type-check` clean
- [x] 5.3 `npm run lint` clean
- [x] 5.4 Update `CHANGELOG.md` under `[unreleased]` (import tasks from CalDAV, one-way)
