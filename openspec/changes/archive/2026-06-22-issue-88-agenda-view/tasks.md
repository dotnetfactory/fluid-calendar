## 1. Pure agenda-formatting helper (TDD)

- [x] 1.1 Write failing unit tests in `src/__tests__/calendar-agenda.test.ts` for `formatAgendaItems(items, feeds)` covering: includes items whose `feedId === "tasks"` even when no matching feed; excludes items whose feed is disabled or missing; includes items whose feed is enabled; resolves background/border color from task color (tasks) or feed color (events) with sensible fallbacks; preserves `extendedProps` (isTask, status, priority, isRecurring); tags task/event classNames; sorts the result by start time ascending
- [x] 1.2 Implement `src/lib/calendar-agenda.ts` with `formatAgendaItems` to make the tests pass (mirroring the existing `handleDatesSet` mapping used by the other views)

## 2. AgendaView component

- [x] 2.1 Add `@fullcalendar/list` to `package.json` at the same `6.1.x` version as the other `@fullcalendar/*` packages
- [x] 2.2 Create `src/components/calendar/AgendaView.tsx` using `listPlugin` (`initialView="listWeek"`), reusing `getAllCalendarItems` + `formatAgendaItems`, feed/task data loading, `EventQuickView` on click, `noEventsContent` empty state, and time formats from user settings (mirroring `DayView.tsx` patterns)
- [x] 2.3 Add `resolveEventDeleteMode` (TDD) so deleting a recurring occurrence from the agenda quick view deletes only that occurrence (`single`) and never escalates an expanded instance to a whole-series delete; only the recurring master deletes as `series` (fixes Codex review finding)
- [x] 2.4 Wire the shared `useEventModalStore` into AgendaView (open state + defaultDate/defaultEndDate + clear on close) so the global `calendar.new-event` command/shortcut opens the New Event modal while the agenda is active, matching Day/Week/Month/Year (fixes Codex review finding)

## 3. Wire into the calendar header

- [x] 3.1 Add an "Agenda" button to the view switcher in `src/components/calendar/Calendar.tsx`
- [x] 3.2 Add a render branch so `view === "agenda"` renders `AgendaView` (not the `multiMonth` fallthrough)
- [x] 3.3 Confirm prev/next header navigation steps by week (not month) when the agenda view is active (agenda falls into the existing 7-day `else` branch in `handlePrev/NextWeek`)

## 4. Verify + document

- [x] 4.1 Local gate green: `npm run test:unit` (new `calendar-agenda` suite passes; 2 pre-existing unrelated `google-*` suites fail identically on `origin/main`), `npm run type-check` clean, `npm run lint` clean
- [x] 4.2 Add a `CHANGELOG.md` entry under `[unreleased]`
