## ADDED Requirements

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

### Requirement: Series delete removes the whole recurring series

When deleting in series mode an event that belongs to a recurring series, the system SHALL delete the master recurring event so the entire series is removed.

#### Scenario: Deleting a series

- **WHEN** `deleteGoogleEvent` is called with `mode: "series"` for an occurrence whose `recurringEventId` is set
- **THEN** the system calls `events.delete` with the `recurringEventId` (the master event)
