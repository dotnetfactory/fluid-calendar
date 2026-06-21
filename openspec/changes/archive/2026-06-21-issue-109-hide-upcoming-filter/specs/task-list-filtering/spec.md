## ADDED Requirements

### Requirement: Hide upcoming tasks filter

The Tasks list view SHALL provide a "Hide upcoming tasks" filter. When enabled, the list MUST hide every task that is classified as upcoming and MUST show every task that is not. A task SHALL be classified as upcoming using the same rule that drives the visible "Upcoming" badge: the task has a `startDate` and that start date falls on a later calendar day than today (day-granularity, per the `isFutureDate` helper). When the filter is disabled, the upcoming classification SHALL have no effect on which tasks are shown.

#### Scenario: Filter hides a task starting on a future day

- **WHEN** the "Hide upcoming tasks" filter is enabled
- **AND** a task has a `startDate` that falls on a later calendar day than today
- **THEN** the task is excluded from the list

#### Scenario: Filter keeps a task starting later today

- **WHEN** the "Hide upcoming tasks" filter is enabled
- **AND** a task has a `startDate` that is later today (the same calendar day as now, even if the time is after the current instant)
- **THEN** the task remains visible in the list, consistent with not showing an "Upcoming" badge

#### Scenario: Filter keeps a task with no start date

- **WHEN** the "Hide upcoming tasks" filter is enabled
- **AND** a task has no `startDate`
- **THEN** the task remains visible in the list

#### Scenario: Filter keeps a task that started in the past

- **WHEN** the "Hide upcoming tasks" filter is enabled
- **AND** a task has a `startDate` on a previous calendar day
- **THEN** the task remains visible in the list

#### Scenario: Disabled filter shows upcoming tasks

- **WHEN** the "Hide upcoming tasks" filter is disabled
- **AND** a task has a `startDate` that falls on a later calendar day than today
- **THEN** the task is shown in the list (the upcoming classification has no effect)

### Requirement: Single source of truth for the upcoming classification

The rule that classifies a task as upcoming SHALL be defined once in a pure, unit-testable function and reused by both the list filter and the "Upcoming" badge, so the filter and the badge can never disagree about which tasks are upcoming.

#### Scenario: Filter and badge agree

- **WHEN** any task is evaluated for the "Upcoming" badge and for the "Hide upcoming tasks" filter
- **THEN** both use the same upcoming classification, so every task that would display an "Upcoming" badge is exactly the set of tasks hidden when the filter is enabled
