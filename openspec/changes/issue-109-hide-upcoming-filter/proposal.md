## Why

The Tasks list has a "Hide upcoming tasks" checkbox filter that does not work as labeled (GitHub issue #109). The filter predicate compares a task's `startDate` against the current instant, while the app's own "Upcoming" badge classifies a task as upcoming using a day-granularity helper (`isFutureDate`). Because the two definitions of "upcoming" diverge, checking the box hides or keeps the wrong set of tasks - a task shown without an "Upcoming" badge can still be hidden (e.g. a task starting later today), and the filter does not reliably hide exactly the tasks the user sees as upcoming.

## What Changes

- Make the "Hide upcoming tasks" filter use the same definition of "upcoming" as the visible "Upcoming" badge: a task is upcoming iff it has a `startDate` and `isFutureDate(startDate)` is true (the start date falls on a later calendar day).
- Extract the task-list filtering decision for a single task into a small, pure, unit-testable helper so the "upcoming" rule has one source of truth and can be covered by a regression test (the list component is a `.tsx` rendered in a Node Jest env with no jsdom, so the predicate must live in a `.ts` module to be testable).
- Add unit tests covering the upcoming-task filter boundary (later today, today, tomorrow, no start date) so it stays consistent with the badge.

No API behavior change is required: the Tasks list is filtered client-side from already-fetched data, so the fix is confined to the client predicate.

## Capabilities

### New Capabilities
- `task-list-filtering`: Client-side filtering of the Tasks list view, including the "Hide upcoming tasks" filter and its definition of an upcoming task.

### Modified Capabilities
<!-- None: no existing spec defines this behavior yet. -->

## Impact

- `src/components/tasks/TaskList.tsx` - the inline filter predicate is replaced by a call to the extracted helper.
- New `src/components/tasks/utils/task-list-utils.ts` helper (or a sibling util) - the pure `taskMatchesFilters` / upcoming predicate.
- New unit test under `src/__tests__/` covering the upcoming-task rule.
- No change to the `/api/tasks` route or the Zustand stores' shapes.
