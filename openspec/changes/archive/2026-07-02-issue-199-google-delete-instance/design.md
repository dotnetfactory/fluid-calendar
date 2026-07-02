## Context

`deleteGoogleEvent(accountId, userId, calendarId, eventId, mode)` in `src/lib/google-calendar.ts` handles deleting Google Calendar events. The DELETE route (`src/app/api/calendar/google/events/route.ts`) passes `validatedEvent.externalEventId` - the external id of the exact row the user clicked, which for a recurring occurrence is Google's expanded instance id (`<masterId>_<timestamp>`). `task-block-push.ts` passes a non-recurring event id for pushed task blocks.

Current single-mode logic ignores the provided id and instead calls `events.instances({ eventId: recurringEventId || eventId, timeMin: now, maxResults: 1 })`, then deletes `instances[0].id`. That is the **next upcoming** occurrence, not the clicked one. Deleting a past or non-next row removes a different (often future) occurrence - data loss.

`deleteGoogleEvent` resolves its Google client via a same-module call to `getGoogleCalendarClient`, which is not mockable from a test importing the function, so the function currently has no unit coverage.

## Goals / Non-Goals

**Goals:**
- Single-mode delete targets the exact clicked occurrence (`eventId`), with no "next upcoming" re-query.
- Add a minimal seam so `deleteGoogleEvent` is unit-testable with a mocked Google client.
- Regression test that asserts the clicked id is the one deleted and `events.instances` is not called in single mode.

**Non-Goals:**
- No change to series-mode behavior (still deletes the master via `recurringEventId`).
- No change to `deleteGoogleEvent`'s exported signature or to any caller.
- Not touching the analogous `updateGoogleEvent` single-instance logic (out of scope for #199; could be a follow-up).

## Decisions

**Decision: In single mode, delete the provided `eventId` directly.**
The provided id already identifies the occurrence. After the series-mode branch, single mode simply calls `events.delete({ calendarId, eventId })`. The `events.instances` lookup and the trailing fallback `events.delete` collapse into one direct delete. Rationale: the re-query was both wrong (wrong occurrence) and unnecessary (id already known). Alternative considered - keep `events.instances` but pass `timeMin`/`timeMax` bounding the clicked occurrence - rejected as needlessly complex and still indirect.

**Decision: Make the calendar-client getter mockable via a default-parameter seam.**
Add an optional injected client/getter parameter to `deleteGoogleEvent` defaulting to the real `getGoogleCalendarClient`, so tests pass a fake `calendar` with `events.{get,delete,instances}` jest mocks (matching the existing `google-provider.unit.test.ts` fake-client style). Rationale: smallest change that yields coverage without a module-mock framework. Alternatives considered: `jest.mock` of the whole module (brittle, mocks more than needed) or `jest.spyOn` on the same-module export (does not intercept the internal same-module reference) - both rejected.

We keep fetching the event via `events.get` (as the original code did) because both branches need its metadata: the **series** branch needs `recurringEventId`, and single mode needs it for the master guard below.

**Decision: Guard single mode against deleting a recurring master.** Master recurring rows are persisted by Google sync with `externalEventId = <masterId>`, `isMaster: true`, `recurrence` set, and no `recurringEventId` (an expanded occurrence has `recurringEventId` set). The DELETE route forwards `validatedEvent.externalEventId` plus the caller-supplied `mode`, so a stale client or a UI path exposing a master row could request `mode: "single"` on a master id - and Google deletes a master id as the **whole series**, which is worse than the wrong-occurrence bug. So single mode now refuses (throws) when the target has `recurrence` and no `recurringEventId`. Rationale: a single delete must target an expanded occurrence; deleting a series must go through series mode. Alternative considered - silently rewriting the request to series mode - rejected because "delete one occurrence" should never escalate to "delete the whole series" without the caller asking. (Surfaced by Codex adversarial review.)

## Risks / Trade-offs

- [The clicked occurrence's `externalEventId` might not be the expanded instance id in some sync path] → The DELETE route passes `validatedEvent.externalEventId`, which the sync stores as Google's per-instance id; `events.delete` accepts an instance id directly. Non-recurring callers (task-block) pass the event's own id, which is also valid. Test covers both.
- [Adding a parameter could confuse callers] → It is optional with a default, so all existing call sites are unaffected and the signature stays backward-compatible.

## Migration Plan

Pure code fix, no data migration. Rollback is reverting the commit.
