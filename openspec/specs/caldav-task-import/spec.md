# caldav-task-import Specification

## Purpose
TBD - created by archiving change issue-144-caldav-task-import. Update Purpose after archive.
## Requirements
### Requirement: Discover CalDAV task collections

FluidCalendar SHALL list a connected CalDAV account's task collections by querying the account's calendar collections and keeping only those whose advertised component set includes `VTODO`. Each task collection SHALL be presented as a task list whose identifier is the collection's CalDAV URL and whose name is the collection's display name.

#### Scenario: Only VTODO-capable collections are listed

- **WHEN** the CalDAV task provider lists task lists for an account that has one calendar supporting `VEVENT` only and one calendar supporting `VTODO`
- **THEN** the returned task lists contain the `VTODO`-supporting collection
- **AND** the returned task lists do not contain the `VEVENT`-only collection
- **AND** the `VTODO` collection's task-list id equals its CalDAV URL and its name equals its display name

### Requirement: Import VTODO items as tasks

FluidCalendar SHALL read the `VTODO` components from a chosen CalDAV task collection and expose each as an external task. A `VTODO` without a `UID` SHALL be skipped (a stable identifier is required for linking), and a `VTODO` that fails to parse SHALL be skipped without aborting the import of the rest.

#### Scenario: VTODO items are read from a collection

- **WHEN** the provider reads tasks from a collection whose iCalendar payload contains two valid `VTODO` components
- **THEN** the provider returns two external tasks
- **AND** each external task's id equals the corresponding `VTODO` `UID`

#### Scenario: A VTODO without a UID is skipped

- **WHEN** the provider reads a collection containing one `VTODO` with a `UID` and one `VTODO` with no `UID`
- **THEN** only the `VTODO` with a `UID` is returned

### Requirement: Map VTODO fields to FluidCalendar task fields

When converting a `VTODO` to a task, FluidCalendar SHALL map: `SUMMARY` to title (defaulting to a non-empty placeholder when absent), `DESCRIPTION` to description, `DUE` to due date, `DTSTART` to start date, `COMPLETED` to completed date, `STATUS` to the task status (`COMPLETED` to completed; any other or absent status to an open/todo status), and a present `RRULE` to a recurrence rule with the task marked recurring.

#### Scenario: A completed dated VTODO maps correctly

- **WHEN** a `VTODO` has `SUMMARY:Buy milk`, a `DUE` date, and `STATUS:COMPLETED`
- **THEN** the resulting task has title `Buy milk`
- **AND** the resulting task's due date equals the `DUE` value
- **AND** the resulting task's status is the completed status

#### Scenario: Clearing an external-owned field upstream clears it locally

- **WHEN** a previously imported task was completed (or had a due date, description, or recurrence rule) and the corresponding `VTODO` is later changed so that property is removed (e.g. the task is reopened so `COMPLETED`/`STATUS:COMPLETED` is gone)
- **THEN** the next incoming sync clears the local task's external-owned field (the local copy mirrors the CalDAV source of truth) rather than retaining the stale value
- **AND** local-owned fields (such as start date) are preserved

#### Scenario: A recurring VTODO is marked recurring

- **WHEN** a `VTODO` has an `RRULE` of `FREQ=WEEKLY`
- **THEN** the resulting task is marked recurring
- **AND** the resulting task carries a recurrence rule string containing `FREQ=WEEKLY`

### Requirement: CalDAV task sync is import-only

The CalDAV task provider SHALL support reading task lists and tasks for incoming sync. Outgoing write-back operations (create, update, delete on the CalDAV server) SHALL fail with an explicit "not supported" error rather than silently succeeding, until bidirectional CalDAV task sync is implemented.

#### Scenario: Creating a task on the CalDAV server is rejected

- **WHEN** code calls the CalDAV task provider's create-task operation
- **THEN** the operation throws an error indicating CalDAV task write-back is not supported

#### Scenario: An import-only CalDAV sync never deletes local tasks from a partial read

- **WHEN** a CalDAV mapping is synced and the external read returns no tasks (e.g. a transient or partial failure)
- **THEN** previously imported local tasks linked to that mapping are not deleted
- **AND** no write-back operation is attempted against the CalDAV server

### Requirement: CalDAV credentials are only used for the owning user

Before FluidCalendar uses a CalDAV account's stored URL and password to list or import tasks, it SHALL verify that the linked account is owned by the requesting/provider user and is a CalDAV account. A task provider linked to an account the user does not own SHALL NOT have that account's CalDAV credentials used.

#### Scenario: A provider linked to another user's account is rejected

- **WHEN** a CalDAV task provider's linked account is not owned by the provider's user (or is not a CalDAV account)
- **THEN** listing or importing tasks for that provider fails without contacting the CalDAV server using that account's credentials

### Requirement: CalDAV task import is reachable from the settings UI

A user with a connected CalDAV account SHALL be able to select it when creating a task provider in the task-sync settings, so CalDAV task import can be enabled without hand-calling the API.

#### Scenario: A CalDAV account appears as a task-provider option

- **WHEN** the user opens the task-sync provider creation dialog with a connected CalDAV account
- **THEN** that CalDAV account is offered as a compatible account
- **AND** selecting it creates a provider of type CALDAV

