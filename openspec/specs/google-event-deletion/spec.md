# google-event-deletion Specification

## Purpose
TBD - created by archiving change issue-199-google-delete-instance. Update Purpose after archive.
## Requirements
### Requirement: Single-occurrence delete targets the clicked instance

When deleting a single occurrence of a Google Calendar event, the system SHALL delete the exact occurrence identified by the `eventId` passed to `deleteGoogleEvent`. The system SHALL NOT re-query Google for the "next upcoming instance" (e.g. via `events.instances` with `timeMin: now` / `maxResults: 1`) and delete that instead.

The `eventId` provided already identifies the specific occurrence (for a recurring event it is the expanded instance id such as `<masterId>_<timestamp>`; for a non-recurring event it is the event's own id), so single-mode deletion targets it directly.

#### Scenario: Deleting a recurring occurrence removes that occurrence

- **WHEN** `deleteGoogleEvent` is called with `mode: "single"` and an `eventId` that is the expanded id of a specific recurring occurrence
- **THEN** the system calls `events.delete` with exactly that `eventId`
- **AND** the system does NOT call `events.instances`

#### Scenario: Deleting a past occurrence does not delete a future one

- **WHEN** a user deletes a past or non-next occurrence (its `eventId` is not Google's next upcoming instance)
- **THEN** the system deletes the clicked occurrence's `eventId`
- **AND** no other occurrence (including the next upcoming one) is deleted

#### Scenario: Deleting a non-recurring event

- **WHEN** `deleteGoogleEvent` is called with `mode: "single"` and an `eventId` for a non-recurring event (as in task-block single-mode deletes)
- **THEN** the system calls `events.delete` with that `eventId`
- **AND** the system does NOT attempt an `events.instances` lookup

### Requirement: Non-series delete never deletes an entire recurring series

A delete in any mode other than `"series"` MUST NOT delete a recurring master event, because Google treats deleting a master as deleting the whole series. The system SHALL refuse the delete when the mode is not exactly `"series"` and the target is a recurring master (it has `recurrence` set and no `recurringEventId`) rather than silently erasing the series. The guard applies to any non-`"series"` value (including `"single"`, an unknown string, or a missing mode) because the mode arrives from request JSON untyped and could be malformed.

#### Scenario: Refusing a single-mode delete of a recurring master

- **WHEN** `deleteGoogleEvent` is called with `mode: "single"` and an `eventId` whose event has `recurrence` set and no `recurringEventId` (a recurring master)
- **THEN** the system throws an error and does NOT call `events.delete`
- **AND** the whole recurring series is left intact

#### Scenario: An invalid or missing mode cannot bypass the master guard

- **WHEN** `deleteGoogleEvent` is called for a recurring master with a mode that is neither `"single"` nor `"series"` (e.g. an unknown string or a missing value forwarded from request JSON)
- **THEN** the system throws an error and does NOT call `events.delete`
- **AND** the whole recurring series is left intact

### Requirement: Series delete removes the whole recurring series

When deleting in series mode an event that belongs to a recurring series, the system SHALL delete the master recurring event so the entire series is removed.

#### Scenario: Deleting a series

- **WHEN** `deleteGoogleEvent` is called with `mode: "series"` for an occurrence whose `recurringEventId` is set
- **THEN** the system calls `events.delete` with the `recurringEventId` (the master event)
