# calendar-event-selection Specification

## Purpose
TBD - created by archiving change issue-79-multiday-allday-drag. Update Purpose after archive.
## Requirements
### Requirement: All-day drag selection creates a multi-day event

When the user drags a date selection across the all-day row of a calendar view (an all-day selection), the New Event modal SHALL open pre-filled as an all-day event spanning exactly the days the user dragged over. This SHALL behave consistently across the month, week, day, and multi-month views.

FullCalendar reports an all-day selection with an **exclusive** end (the day after the last selected day), which is the same exclusive convention used by the event store, the provider serializers (Google/Outlook/CalDAV), and FullCalendar's own all-day rendering. The selection handler SHALL pass this start and end through unchanged for all-day selections, so the created event spans the dragged days and round-trips consistently. It SHALL NOT collapse an all-day selection to a single day, and SHALL NOT perform date arithmetic that could shift the boundary across a daylight-saving-time transition.

#### Scenario: Dragging across multiple all-day cells
- **WHEN** the user drags across three consecutive days (e.g. the 10th through the 12th) on the all-day row
- **THEN** the New Event modal opens with "All day" enabled, the start set to the first day (the 10th), and the end set to FullCalendar's exclusive end (the 13th), so the saved event spans the 10th through the 12th

#### Scenario: Single-day all-day selection
- **WHEN** the user clicks or selects a single all-day cell (e.g. the 10th)
- **THEN** the New Event modal opens with "All day" enabled, the start set to that day (the 10th) and the end set to the exclusive next day (the 11th), so the saved event spans only the 10th

#### Scenario: Timed (non-all-day) selection is unchanged
- **WHEN** the user drags a selection over the time grid that is not an all-day selection
- **THEN** the New Event modal opens with "All day" disabled, the start set to the selection start and the end set to the selection end exactly as reported by the calendar

#### Scenario: All-day selection spanning a DST transition keeps both days
- **WHEN** the user drags across an all-day range whose end falls on the day after a spring-forward transition (a 23-hour day)
- **THEN** the end passed to the modal is still the correct exclusive calendar day (no day is dropped by time arithmetic)

