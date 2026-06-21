## Context

FullCalendar selection is already wired in all four selectable views (`MonthView`, `WeekView`, `DayView`, `MultiMonthView`): each sets `selectable`, `selectMirror`, and a `select={handleDateSelect}` handler, and each `handleDateSelect` is identical:

```ts
const handleDateSelect = (selectInfo: DateSelectArg) => {
  const start = selectInfo.start;
  const end = selectInfo.allDay ? start : selectInfo.end;
  setSelectedDate(start);
  setSelectedEndDate(end);
  setSelectedEvent({ allDay: selectInfo.allDay });
  setIsEventModalOpen(true);
};
```

The `selectInfo.allDay ? start : selectInfo.end` line collapses *every* all-day selection to a single day, which is exactly what blocks multi-day all-day creation (issue #79).

## Key facts about FullCalendar's `DateSelectArg`

- For an **all-day** selection, `start` is the first selected day at local midnight and `end` is the day **after** the last selected day at local midnight (end is **exclusive**). So a Mon–Wed drag gives `start = Mon 00:00`, `end = Thu 00:00`.
- For a **single** all-day cell, `start = that day 00:00`, `end = next day 00:00`.
- For a **timed** selection, `start`/`end` are the exact selected instants.

## How `end` flows all the way to the provider (decides the right value)

`EventModal` passes the submitted `end` straight into `addEvent`, and the provider serializers send all-day ends to the calendar API **verbatim as an exclusive date**:

- Google (`src/lib/google-calendar.ts`): `end.date = event.end.toISOString().split("T")[0]`. Google's all-day `end.date` is **exclusive** (the day after the last day).
- The reverse sync stores the exclusive end too (`createAllDayDate(event.end?.date)`), and FullCalendar renders all-day events with an **exclusive** `end` (default `nextDayThreshold`).

So the entire stack — provider API, stored `CalendarEvent.end`, and FullCalendar rendering — uses an **exclusive** all-day end. FullCalendar's `selectInfo.end` for an all-day drag is *already* that exclusive end (Jun 13 for a Jun 10–12 drag). Passing it through unchanged makes the created event span exactly the dragged days and round-trip consistently.

## Decision

The only bug is the `selectInfo.allDay ? start : selectInfo.end` collapse, which throws away the (already-correct, exclusive) `end` for all-day selections. The fix is simply to stop collapsing: return `selectInfo.end` unchanged for all-day selections too.

Introduce a single shared pure helper used by all four views (instead of fixing four byte-identical copies):

```ts
// src/lib/calendar-selection.ts
export function getSelectionRange(selectInfo): { start; end; allDay } {
  // Previously all-day collapsed end to start, dropping multi-day drags.
  // The exclusive all-day end FullCalendar provides is exactly what the
  // provider/store/render layers expect, so pass start/end through verbatim.
  return { start: selectInfo.start, end: selectInfo.end, allDay: selectInfo.allDay };
}
```

This eliminates *any* date arithmetic, so there is no DST edge case and no off-by-one at the persistence boundary.

### Why NOT subtract a day to show the "inclusive" last day

An earlier draft subtracted 24h to display the inclusive last dragged day in the modal. That was wrong: the modal's `end` is persisted as the provider's **exclusive** end, so subtracting a day would save an event one day short (and the millisecond subtraction also mishandled spring-forward DST). The modal already displays the exclusive end for existing all-day events, so passing the exclusive end is also consistent with how the modal already behaves.

> Note: there is a separate, pre-existing question of whether the modal should *display* an inclusive end for all-day events (it currently shows the exclusive end). That convention predates this change, affects manual all-day creation/edit equally, and is out of scope for #79.

### Why a shared helper instead of editing each view

The four handlers are byte-identical. A shared helper means one place to test and one place that can't drift. Each view keeps its own `handleDateSelect` wrapper (it still calls the view-local state setters) but delegates the mapping to `getSelectionRange`.

## Alternatives considered

- **Edit the four handlers in place**: rejected — duplicates the fix; the copies can drift; harder to unit-test.
- **Subtract a day to show an inclusive end**: rejected — breaks the exclusive persistence convention (saves one day short) and introduces a DST edge case. See above.

## Risks

- Very low. UI-only pre-fill; no date math; no change to persistence, API, store, or the existing all-day convention. Covered by unit tests on the helper, including a DST-window case.
