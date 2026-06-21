# Tasks

## 1. Define semantic rank maps
- [x] 1.1 Add `PRIORITY_SORT_RANK` (`none=0, low=1, medium=2, high=3`) and `ENERGY_LEVEL_SORT_RANK` (`low=1, medium=2, high=3`) maps keyed by enum value in `src/components/tasks/utils/task-list-utils.ts`.

## 2. Use rank maps in the task list comparator
- [x] 2.1 Update the `priority` case in `TaskList.tsx` `sortedTasks` to compare by priority rank (times direction) via `compareTaskPriority`, keeping the null-last guards.
- [x] 2.2 Update the `energyLevel` case similarly using `compareTaskEnergyLevel`.

## 3. Tests (TDD)
- [x] 3.1 Add a unit test that sorts a set of tasks by priority ascending and asserts none, low, medium, high order.
- [x] 3.2 Add a unit test for priority descending order.
- [x] 3.3 Add a unit test that tasks without a priority sort last in both directions.
- [x] 3.4 Add unit tests for energy ascending, descending, and null-last behavior.
- [x] 3.5 Add unit tests that an unknown persisted priority/energy string (the DB column is a plain String) buckets last in both directions and compares equal to another unknown value (no NaN). Comparators route missing/unknown ranks last via a shared `rankOf`/`compareRanks` helper.
- [x] 3.6 Add unit tests that prototype-key strings ("toString", "__proto__", "constructor", "hasOwnProperty") are treated as unknown (sort last). `rankOf` uses `Object.hasOwn` so inherited prototype properties never resolve as a rank.

## 4. Gate
- [x] 4.1 `npm run test:unit` for the new tests is green; `npm run type-check` and `npm run lint` are clean.
- [x] 4.2 Update `CHANGELOG.md` under `[Unreleased]` with the user-facing fix.
