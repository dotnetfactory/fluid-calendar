## Why

FluidCalendar offers Day, Week, Month, and Year views, but no way to see what is coming up as a single chronological list (issue #88). The requested "Agenda View" (see the Motion reference image in the issue) is a date-grouped, scrollable list of upcoming events and scheduled tasks - useful for quickly scanning the day/week ahead without scanning a time grid. The `"agenda"` value is already declared in the `CalendarView` type union but no view renders it; selecting it today falls through to the Year view.

## What Changes

- Add an `AgendaView` calendar view that renders calendar events and scheduled tasks as a chronological, date-grouped list using FullCalendar's `listPlugin` (`listWeek`), matching the data, feed-filtering, click-to-quick-view, and time-format behavior of the existing Day/Week/Month views.
- Add an **Agenda** button to the calendar header view switcher, alongside Day / Week / Month / Year.
- Wire the existing `"agenda"` `CalendarView` value through `Calendar.tsx` so it renders `AgendaView` instead of falling through to the Year (`multiMonth`) view.
- Make the header prev/next navigation step by a week when the Agenda view is active (the agenda spans a week, like the Week view).
- Show an empty-state message when the agenda range has no events or tasks.

## Capabilities

### New Capabilities
- `calendar-agenda-view`: A chronological, date-grouped list view of upcoming calendar events and scheduled tasks, selectable from the calendar header.

### Modified Capabilities
<!-- None: no existing spec covers the calendar view switcher or per-view rendering. -->

## Impact

- Code: new `src/components/calendar/AgendaView.tsx`; `src/components/calendar/Calendar.tsx` (add the Agenda button + render branch + week-stepping for agenda); `package.json` (add `@fullcalendar/list` at the same 6.1.x version as the other FullCalendar packages); `CHANGELOG.md`.
- New helper `src/lib/calendar-agenda.ts` (with unit tests) for the pure formatting/filtering logic the view uses, so the behavior is testable without rendering FullCalendar.
- No API, schema, store, or SAAS-gating changes. The view reuses the existing `getAllCalendarItems()` data source and feed-enabled filtering. Open-source feature (no premium gating).
