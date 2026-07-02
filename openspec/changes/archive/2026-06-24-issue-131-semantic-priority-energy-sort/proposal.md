## Why

On the task page, the "Priority" and "Energy" columns sort alphabetically (high, low, medium) instead of by their semantic rank. This is confusing: a user sorting by priority expects low -> medium -> high order, not dictionary order. (GitHub issue #131.)

## What Changes

- Sort the task list "Priority" column by semantic rank instead of alphabetically: `none < low < medium < high` ascending (and the reverse for descending), so the highest-priority tasks group together.
- Sort the task list "Energy" column by semantic rank instead of alphabetically: `low < medium < high` ascending.
- Tasks with no priority / no energy level continue to sort to the end regardless of direction (unchanged behavior).
- Sort direction toggling (asc/desc) continues to work for both columns.

## Capabilities

### New Capabilities
- `task-list-sorting`: Defines how the task list view orders rows for each sortable column, including semantic (rank-based) ordering for the Priority and Energy columns.

### Modified Capabilities
<!-- None: openspec/specs/ has no existing capability specs. -->

## Impact

- `src/components/tasks/TaskList.tsx` - the `sortedTasks` comparator for the `priority` and `energyLevel` cases.
- A small reusable rank map for `Priority` and `EnergyLevel` enums.
- No schema, API, or data migration changes. Display-only ordering change.
