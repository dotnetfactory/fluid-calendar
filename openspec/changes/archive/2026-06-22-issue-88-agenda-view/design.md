## Context

The calendar header (`src/components/calendar/Calendar.tsx`) switches between view components (`DayView`, `WeekView`, `MonthView`, `MultiMonthView`) based on the `view` value from `useViewStore` (`src/store/calendar.ts`). Each view component is a thin wrapper around a `FullCalendar` instance that:
- reads merged events+tasks via `useCalendarStore().getAllCalendarItems(start, end)`,
- filters to enabled feeds (and always-included `feedId === "tasks"`),
- formats each item into FullCalendar's event shape (color from feed/task, `classNames`, `extendedProps`),
- opens an `EventQuickView` popover on click.

The `CalendarView` type already includes `"agenda"` (`src/types/calendar.ts:83`), but `Calendar.tsx` only handles `day`/`week`/`month` and defaults everything else (including `agenda`) to `MultiMonthView`.

## Goals / Non-Goals

Goals:
- A selectable Agenda view that lists upcoming events + scheduled tasks chronologically, grouped by day, reusing existing data and filtering.
- Match existing conventions: time format from user settings, feed-enabled filtering, click → quick view, week-start day.

Non-Goals (kept out to limit blast radius; the issue/image do not require them):
- No inline "Add task" button or "Refresh all tasks" footer from the Motion screenshot (those are separate features; the issue's core ask is the agenda list itself).
- No drag/drop or resize in the agenda (a list view is not a drag surface; FullCalendar's list view is read-oriented).
- No new persisted setting; reuse the existing localStorage-backed `view` state.

## Decisions

### Decision: Use FullCalendar `listPlugin` (`listWeek`)
FullCalendar already powers every other view and ships an official `@fullcalendar/list` plugin that renders exactly this UI (a date-grouped list with a "no events" empty state). Using it keeps the new view consistent with the others (same event objects, same `eventClick`, same time formatting) and avoids hand-rolling a list renderer. We pin it to the same `6.1.x` version as the other `@fullcalendar/*` packages already in `package.json`.

- `initialView="listWeek"` so the agenda shows a rolling week, consistent with the Week view and with the header's week-based prev/next stepping.
- `listDayFormat` / `listDaySideFormat` and `eventTimeFormat` honor the user's 12h/24h `timeFormat` setting.
- `noEventsContent` provides the empty-state message.

### Decision: Extract a pure formatting helper for testability
FullCalendar renders in a browser DOM and is awkward to unit-test in the Node/jsdom Jest env used here. To get real TDD coverage of the load-bearing logic, the item-shaping + feed-filtering logic lives in a pure function `formatAgendaItems(items, feeds)` in `src/lib/calendar-agenda.ts`, mirroring the `handleDatesSet` mapping the other views do inline. `AgendaView` calls this helper, and the unit tests assert on its output (filtering disabled feeds, always including tasks, color resolution, `extendedProps`, sort order). This is the same testing seam used by `src/lib/calendar-selection.ts` (issue #79).

### Decision: Week-step navigation for the agenda
The header's `handlePrevWeek`/`handleNextWeek` step by month for `month`/`multiMonth` and by day/week otherwise. The agenda spans a week (`listWeek`), so it falls into the existing "else" (7-day) branch automatically - we confirm `agenda` is not routed into the month-stepping branch. No new navigation code needed beyond ensuring the branch condition stays correct.

### Decision: Open-source, no SAAS gating
This is a core UI affordance with no premium dimension, so it ships in the shared (non-`.saas`/`.open`) component path like the other views.

## Risks / Trade-offs

- **New dependency**: adds `@fullcalendar/list`. Mitigation: it is a first-party FullCalendar package at the same version as packages already present; minimal supply-chain risk and no transitive bloat beyond the FullCalendar core already installed.
- **List view is read-oriented**: no drag/drop/resize. Acceptable - the feature request is a read/scan view; editing remains available by clicking an item (quick view → edit), consistent with how a click works in other views.
- **Quick-view positioning**: the agenda reuses `EventQuickView` anchored to the clicked element, exactly as the other views do, so behavior is consistent.

## Migration Plan

None. Additive UI only - no data migration, no schema change. Existing persisted `view` values are unaffected; a user whose stored view was already `"agenda"` (previously rendering the Year view) will now correctly see the agenda.

## Open Questions

None blocking. The Motion screenshot's extra chrome ("Add task", "Refresh all tasks", per-task checkboxes) is intentionally out of scope for this change and can be layered on later as separate enhancements.
