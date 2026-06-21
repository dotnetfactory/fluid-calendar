## 1. Extract a unit-testable upcoming/filter helper

- [x] 1.1 Add a pure `isUpcomingTask(task)` helper (using `isFutureDate` from `@/lib/date-utils`) to `src/components/tasks/utils/task-list-utils.ts`
- [x] 1.2 Add a pure `taskMatchesListFilters(task, filters)` helper that encapsulates the single-task filter decision (status, hide-upcoming, energy, time preference, tags, search), reusing `isUpcomingTask`

## 2. Write failing tests (TDD red)

- [x] 2.1 Add `src/__tests__/task-list-filtering.test.ts` covering `isUpcomingTask`: future day -> true, later today -> false, today (start of day) -> false, past day -> false, no startDate -> false
- [x] 2.2 Add tests for `taskMatchesListFilters` covering the hide-upcoming filter on/off against the same boundary cases, and at least one behavior-preserving check per other predicate (status, search)
- [x] 2.3 Run `npm run test:unit` and confirm the new tests fail against the current inline `> now` logic (red)

## 3. Make the tests pass (TDD green)

- [x] 3.1 Replace the inline filter predicate in `src/components/tasks/TaskList.tsx` with `taskMatchesListFilters`, keeping the `useMemo`/project pre-filter intact
- [x] 3.2 Replace the badge predicate in `src/components/tasks/components/TaskRow.tsx` (`isFutureTask`) with `isUpcomingTask` so badge and filter share one rule
- [x] 3.3 Run `npm run test:unit` and confirm all tests pass (green) - new suite 12/12 green; the only failing suites are pre-existing, unrelated Google-provider tests that also fail on clean `origin/main`

## 4. Local gate

- [x] 4.1 `npm run type-check` passes
- [x] 4.2 `npm run lint` passes (zero warnings)
- [x] 4.3 Update `CHANGELOG.md` under `[unreleased]` with the user-facing fix

## 5. Review and finalize

- [x] 5.1 Codex `adversarial-review` returns `approve` (verdict: approve, 0 findings)
- [x] 5.2 Archive the OpenSpec change
