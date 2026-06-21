## ADDED Requirements

### Requirement: Duplicate a project with its incomplete tasks

The application SHALL allow an authenticated user to duplicate one of their own projects into a new project. The duplicate MUST copy the source project's metadata (description and color) and all of the source project's incomplete tasks (tasks whose status is not `completed`). Completed tasks MUST NOT be copied. The new project's name SHALL be the name the user provides; when no name is provided the application MUST fall back to `Copy of <source name>`. The new project's status MUST be `active` regardless of the source project's status. A user MUST NOT be able to duplicate a project they do not own.

#### Scenario: Duplicating copies incomplete tasks only

- **WHEN** a user duplicates a project containing both completed and incomplete tasks
- **THEN** a new project is created
- **AND** the new project contains a copy of every incomplete task (status `todo` or `in_progress`)
- **AND** none of the source project's completed tasks are copied

#### Scenario: New name is used

- **WHEN** a user duplicates a project and supplies a new name
- **THEN** the new project is created with that name

#### Scenario: Default name when none is supplied

- **WHEN** a user duplicates a project named `Acme` without supplying a name
- **THEN** the new project is named `Copy of Acme`

#### Scenario: Duplicate of an archived project is active

- **WHEN** a user duplicates an archived project
- **THEN** the new project's status is `active`

#### Scenario: Cannot duplicate another user's project

- **WHEN** a user attempts to duplicate a project that does not belong to them (or does not exist)
- **THEN** the request is rejected and no project is created

### Requirement: Duplicated tasks are clean template copies

Each duplicated task SHALL carry over its template-relevant, user-owned fields and MUST reset all instance-specific state so the copy behaves as a fresh, unscheduled task in the new project. Carried-over fields are: title, description, status, due date, start date, duration, priority, energy level, preferred time, recurrence (recurring flag and rule), and tag associations. Reset/cleared fields MUST include: external-sync identifiers and sync metadata, auto-schedule artifacts (auto-schedule flag, schedule lock, scheduled start/end, schedule score, last-scheduled), pushed calendar-block references, and lifecycle timestamps (completion and postpone state). Each duplicated task MUST be owned by the user performing the duplication.

#### Scenario: Template fields are preserved

- **WHEN** a task with a title, description, priority, energy level, duration, due date, and tags is duplicated
- **THEN** the copied task has the same title, description, priority, energy level, duration, due date, and tag associations

#### Scenario: External sync state is not cloned

- **WHEN** a task that is linked to an external task provider is duplicated
- **THEN** the copied task has no external task identifier, source, external list, or sync hash

#### Scenario: Schedule and calendar-block state is reset

- **WHEN** an auto-scheduled task that has a pushed calendar block is duplicated
- **THEN** the copied task is not auto-scheduled, has no scheduled start/end or schedule score, and has no calendar-block reference

#### Scenario: Lifecycle state is reset

- **WHEN** a task that was postponed is duplicated
- **THEN** the copied task has no postpone date and no completion timestamps

#### Scenario: Tags reference existing tag records

- **WHEN** a task with tags is duplicated
- **THEN** the copied task is associated with the same existing tag records (no duplicate tag records are created)

### Requirement: Duplicate action is available in the project sidebar

The project sidebar SHALL provide a duplicate action for each project that opens a dialog containing an editable name field defaulting to `Copy of <source name>`. Confirming the dialog MUST create the duplicate and surface it in the sidebar without requiring a manual refresh.

#### Scenario: Opening the duplicate dialog

- **WHEN** a user activates the duplicate action on a project row
- **THEN** a dialog opens with a name field pre-filled with `Copy of <source name>`

#### Scenario: Duplicate appears immediately

- **WHEN** a user confirms the duplicate dialog
- **THEN** the newly created project appears in the project sidebar
