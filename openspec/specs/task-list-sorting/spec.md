# task-list-sorting Specification

## Purpose
TBD - created by archiving change issue-131-semantic-priority-energy-sort. Update Purpose after archive.
## Requirements
### Requirement: Priority column sorts by semantic rank

When the task list is sorted by the Priority column, the system SHALL order tasks by the semantic rank of their priority (`none` < `low` < `medium` < `high`) rather than alphabetically by the priority label.

#### Scenario: Ascending priority order
- **WHEN** the task list is sorted by Priority in ascending direction
- **THEN** tasks appear in the order none, low, medium, high (least intense first)

#### Scenario: Descending priority order
- **WHEN** the task list is sorted by Priority in descending direction
- **THEN** tasks appear in the order high, medium, low, none (most intense first)

#### Scenario: Tasks without a priority sort last
- **WHEN** the task list is sorted by Priority in either direction
- **AND** some tasks have no priority value
- **THEN** the tasks with no priority value appear after all tasks that have a priority

### Requirement: Energy column sorts by semantic rank

When the task list is sorted by the Energy column, the system SHALL order tasks by the semantic rank of their energy level (`low` < `medium` < `high`) rather than alphabetically by the energy label.

#### Scenario: Ascending energy order
- **WHEN** the task list is sorted by Energy in ascending direction
- **THEN** tasks appear in the order low, medium, high (least intense first)

#### Scenario: Descending energy order
- **WHEN** the task list is sorted by Energy in descending direction
- **THEN** tasks appear in the order high, medium, low (most intense first)

#### Scenario: Tasks without an energy level sort last
- **WHEN** the task list is sorted by Energy in either direction
- **AND** some tasks have no energy level value
- **THEN** the tasks with no energy level value appear after all tasks that have an energy level

