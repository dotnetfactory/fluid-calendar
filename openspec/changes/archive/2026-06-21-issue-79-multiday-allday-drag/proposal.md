## Why

Users cannot quickly create a multi-day all-day event by dragging across the all-day row, the way Google Calendar allows (issue #79). Today, dragging across multiple all-day cells collapses the selection to a single day, so creating a multi-day event requires opening the New Event modal and editing the end date by hand.

## What Changes

- When a user drags across multiple days on the all-day row (an all-day selection spanning more than one day), the New Event modal opens pre-filled as an **all-day** event whose start is the first selected day and whose end is the **last** selected day (inclusive), instead of collapsing to a single day.
- A single click / single-day all-day selection continues to open a single-day all-day event (unchanged behavior).
- Timed (non-all-day) selections are unchanged.
- Applies consistently across all calendar views that support selection: month, week, day, and multi-month.

## Capabilities

### New Capabilities
- `calendar-event-selection`: How dragging a date/time selection on the calendar maps to the pre-filled New Event modal, including the all-day multi-day case.

### Modified Capabilities
<!-- None: no existing spec covers calendar selection behavior. -->

## Impact

- Code: `src/components/calendar/MonthView.tsx`, `WeekView.tsx`, `DayView.tsx`, `MultiMonthView.tsx` (the shared `handleDateSelect` end-date computation). No API, schema, or store changes.
- Behavior: only the date pre-fill of the New Event modal for all-day drag selections; no change to how events are persisted.
