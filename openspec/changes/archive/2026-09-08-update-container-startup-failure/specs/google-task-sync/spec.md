## ADDED Requirements

### Requirement: Canonical Google task date fields

The Google task provider SHALL normalize wire `due` into canonical `dueDate` and SHALL send canonical `dueDate` as wire `due`. Changing or clearing local `startDate` SHALL NOT set or clear the Google date. An explicit canonical `dueDate: null` update SHALL clear the Google date.

#### Scenario: Provider date round trip

- **WHEN** a Google task date is read, created, changed, or explicitly cleared
- **THEN** the canonical dueDate value reflects the operation without importing or exporting local startDate

### Requirement: Persist incoming Google completion state

The Google mapper SHALL translate canonical `completedDate` into `completedAt`. Synchronization SHALL persist that timestamp for newly imported and updated completed tasks, and SHALL clear it when a newer Google task is reopened.

#### Scenario: Import or update a completed task

- **WHEN** Google returns a completed task with a completion timestamp
- **THEN** the created or updated local task has the same completion timestamp

#### Scenario: Reopen a task

- **WHEN** a newer Google task is no longer completed
- **THEN** the local task status becomes todo and completedAt is cleared
- **AND** its local startDate remains unchanged
