# calendar-agenda-view Specification

## Purpose
TBD - created by archiving change issue-88-agenda-view. Update Purpose after archive.
## Requirements
### Requirement: Agenda view lists upcoming events and tasks chronologically

The calendar SHALL provide an "Agenda" view that displays calendar events and scheduled tasks as a chronological, date-grouped list for a rolling one-week range. The Agenda view SHALL be selectable from the calendar header view switcher alongside Day, Week, Month, and Year, and selecting it SHALL render the agenda list (not the Year view). The list SHALL include the same items the other views show for the active range: events from enabled feeds plus scheduled tasks, with each task or event opening its quick view on click.

#### Scenario: Selecting the Agenda view
- **WHEN** the user clicks the "Agenda" button in the calendar header
- **THEN** the calendar content area shows a chronological, date-grouped list of events and scheduled tasks for the active week (not the Year/multi-month grid)

#### Scenario: Agenda shows enabled-feed events and tasks
- **WHEN** the Agenda view is active for a range that contains events from an enabled feed and one or more scheduled tasks
- **THEN** those events and tasks appear in the list, sorted by start time, each labeled with its time and colored by its feed or task color

#### Scenario: Disabled feeds are excluded
- **WHEN** a feed is disabled
- **THEN** that feed's events do NOT appear in the Agenda list, while scheduled tasks (feed id `tasks`) continue to appear

#### Scenario: Empty range shows an empty state
- **WHEN** the Agenda view is active for a range with no events and no scheduled tasks
- **THEN** the list shows an empty-state message rather than an empty/blank area

#### Scenario: Time format follows user settings
- **WHEN** the user's time-format setting is 12-hour (or 24-hour)
- **THEN** the times shown in the Agenda list are rendered in that format

#### Scenario: Navigation steps by week
- **WHEN** the Agenda view is active and the user clicks the header next/previous navigation
- **THEN** the agenda range advances or retreats by one week (consistent with the Week view), not by a month

#### Scenario: Deleting a recurring occurrence does not delete the whole series
- **WHEN** the user deletes a recurring event occurrence from the Agenda quick view that is an expanded instance (not the recurring master)
- **THEN** only that occurrence is deleted (delete mode `single`), and the rest of the series is left intact; only deleting the recurring master deletes the series

#### Scenario: The global "new event" command works while the Agenda view is active
- **WHEN** the user triggers the calendar create-event command (or shortcut) while the Agenda view is active
- **THEN** the New Event modal opens (the Agenda view honors the shared event-modal store, like the other calendar views), rather than the command silently doing nothing

