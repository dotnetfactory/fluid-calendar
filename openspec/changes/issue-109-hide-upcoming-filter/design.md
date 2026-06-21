## Context

The Tasks list (`src/app/(common)/tasks/page.tsx`) fetches all tasks via `useTaskStore.fetchTasks()` and passes the full array to `<TaskList tasks={tasks} />`. `TaskList` (`src/components/tasks/TaskList.tsx`) applies all visible-filtering client-side from `useTaskListViewSettings` (status, energy, time preference, tags, search, and `hideUpcomingTasks`). The list the user sees is therefore governed entirely by the client predicate, not by the `/api/tasks` query.

Two places decide what "upcoming" means, and they disagree:

- The visible **"Upcoming" badge** in `src/components/tasks/components/TaskRow.tsx:45`:
  `const isFutureTask = task.startDate && isFutureDate(task.startDate);`
  `isFutureDate` (`src/lib/date-utils.ts:226`) is **day-granularity**: `startOfDay(date) >= startOfDay(tomorrow)`.
- The **"Hide upcoming tasks" filter** in `TaskList.tsx:84-90`:
  `if (hideUpcomingTasks && task.startDate && newDate(task.startDate) > now) return false;`
  This is **instant-granularity**: it hides any task whose `startDate` timestamp is after the current moment.

Because the filter uses instant comparison while the badge uses day comparison, the filter hides tasks the user does not see as upcoming (e.g. a task starting later today) and is generally inconsistent with the "Upcoming" label - the reported bug ("filter not working").

## Goals / Non-Goals

Goals:
- Make the "Hide upcoming tasks" filter hide exactly the tasks classified as upcoming by the existing "Upcoming" badge.
- Give the "upcoming" rule a single source of truth that is unit-testable.

Non-Goals:
- No change to the `/api/tasks` server-side `hideUpcomingTasks` handling. (The list is filtered client-side; the server predicate is not on the user-facing path for this view. Touching it would widen the blast radius without affecting the reported bug. Noted as a known follow-up.)
- No change to what `startDate` means or to the data model.
- No redefinition of "upcoming" - we adopt the existing badge definition, not invent a new one.

## Decisions

### Decision: Reuse `isFutureDate` as the single upcoming rule

Define one predicate, `isUpcomingTask(task)`, as `Boolean(task.startDate) && isFutureDate(task.startDate)`, and use it in both `TaskList` (the filter) and `TaskRow` (the badge). This guarantees the filter and the badge can never disagree (the spec's "single source of truth" requirement).

Alternative considered: change only `TaskList.tsx` from `> now` to `isFutureDate(...)` inline. Rejected because it leaves two independent copies of the rule (badge + filter) that can drift again; extracting one helper is barely more code and removes the class of bug.

### Decision: Put the helper in a pure `.ts` module so it is testable

The Jest config is Node-env with `testMatch: src/**/__tests__/**/*.test.ts` and no jsdom, so `.tsx` components cannot be rendered in tests. The upcoming rule (and, to keep the predicate cohesive, the whole single-task filter decision) is extracted into `src/components/tasks/utils/task-list-utils.ts` (an existing util module for this feature) as pure functions that take a `Task` plus the filter settings and return a boolean. The component imports them; the test imports them directly. `date-utils` helpers (`newDate`, `isFutureDate`) remain the only date access, per repo convention.

### Decision: Keep the `now`-based filters' other behavior unchanged

Only the upcoming branch changes semantics. Status / energy / time-preference / tags / search predicates are moved verbatim into the helper (behavior-preserving) so the component keeps one filter entry point. The `useMemo` dependency list and project pre-filter stay as they are.

## Risks / Trade-offs

- Risk: moving the other predicates into a helper could subtly change behavior. Mitigation: the move is verbatim; the regression test asserts the unchanged predicates still behave as before for representative cases, and `type-check` + existing suite guard the refactor.
- Trade-off: a task starting *later today* will now remain visible when the filter is on (previously hidden). This is the corrected, intended behavior - it matches the "Upcoming" badge, which never marked same-day tasks as upcoming.

## Migration Plan

None. Pure client-side behavior fix; no data, schema, or API migration. The persisted `hideUpcomingTasks` setting keeps working.

## Open Questions

- Should the server-side `/api/tasks` `hideUpcomingTasks` predicate (`route.ts:71-73`, also instant/`lte: now`-based) be aligned to day-granularity too? Out of scope for this fix because it is not on the user-facing list path; flagged as a follow-up.
