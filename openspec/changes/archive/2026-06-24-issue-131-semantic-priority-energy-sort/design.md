## Context

The task list (`src/components/tasks/TaskList.tsx`) builds `sortedTasks` with a `switch (sortBy)` comparator. The `priority` and `energyLevel` cases compare with `String.localeCompare`, which orders the enum string values alphabetically (`high`, `low`, `medium`) rather than by their real-world rank. The issue (#131) asks for rank-based ordering and suggests mapping categories to numbers.

The enums (`src/types/task.ts`):
- `Priority`: `high | medium | low | none`
- `EnergyLevel`: `high | medium | low`

## Goals / Non-Goals

**Goals:**
- Priority and Energy columns sort by semantic rank, ascending = least-intense first (`none/low` ... `high`).
- Direction toggling keeps working.
- Empty values (`null`/`undefined` priority or energyLevel) keep sorting to the bottom regardless of direction, matching the current behavior of the other nullable columns.

**Non-Goals:**
- Changing the `preferredTime` (TimePreference) column ordering. It is also alphabetical today but the issue does not mention it; out of scope to keep the diff minimal. (Noted as a possible follow-up.)
- Persisting any new setting; this is display-only.
- Changing BoardView grouping/ordering.

## Decisions

- **Rank map per enum, ascending from least to greatest.** Define `PRIORITY_SORT_RANK` (`low=1, medium=2, high=3`) and `ENERGY_LEVEL_SORT_RANK` (`low=1, medium=2, high=3`) and compare `rank(a) - rank(b)` times `direction`. This is exactly the "map categories to numbers" approach the issue requests and mirrors the existing numeric comparison used for `duration`.
  - *Alternative considered:* inline object literals in the comparator. Rejected: a named, exported map is reusable and testable in isolation.
- **Treat `Priority.NONE` as "no priority", same as null/missing - both bucket last.** The app stores the no-priority intent two ways: `TaskModal` saves `null` when the Select is untouched but the literal `"none"` when the user explicitly picks None, and inline editing converts `"none"` back to `null`. The DB column is a nullable string so both coexist. If `"none"` were ranked among real values it would sort to the opposite end of the list from `null`, splitting identical-intent rows. So `NONE` is intentionally omitted from the rank map; `rankOf` returns `undefined` for it and `compareRanks` buckets undefined last (two undefineds compare equal), unifying `"none"` and `null`.
- **Robust rank lookup.** `rankOf` uses `Object.prototype.hasOwnProperty.call` so unknown persisted strings (the column is a plain `String?`, e.g. a stale/imported `"urgent"`) and object-prototype keys (`"toString"`, `"__proto__"`) never resolve to a rank; they are treated as unknown and bucket last instead of producing `NaN` (which `Array.sort` would treat as equal, silently corrupting order).
- **Ascending = low priority first, no-priority last.** Matches the column's sibling behavior (e.g. `title` A->Z ascending) and the issue's example mapping (`low=1, medium=2, ...`). Users can toggle to descending for high-first.

## Risks / Trade-offs

- [Users may expect descending = high-first by default] -> Direction defaults are unchanged; this only fixes the *ordering within a direction*. No default flip, so no surprise for existing users; toggling still available.
- [Adding a rank map could drift from the enum if a new level is added] -> Map is colocated with the enums' usage and covered by a unit test that asserts ordering, which would catch a missing entry.

## Migration Plan

Pure front-end display change; no migration, no rollback steps beyond reverting the commit.

## Open Questions

None.
