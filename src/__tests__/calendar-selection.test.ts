import { getSelectionRange } from "@/lib/calendar-selection";

describe("getSelectionRange", () => {
  it("keeps the full range for a multi-day all-day drag (exclusive end, not collapsed)", () => {
    // FullCalendar reports an all-day Mon-Wed (10th-12th) drag with an
    // EXCLUSIVE end of the 13th at midnight. The store/providers/render layers
    // all use this exclusive convention, so it must pass through unchanged.
    const start = new Date(2026, 5, 10, 0, 0, 0); // Wed Jun 10 2026 local
    const exclusiveEnd = new Date(2026, 5, 13, 0, 0, 0); // Sat Jun 13 2026 local

    const { start: rangeStart, end, allDay } = getSelectionRange({
      start,
      end: exclusiveEnd,
      allDay: true,
    });

    expect(allDay).toBe(true);
    expect(rangeStart).toEqual(start);
    // The exclusive end (13th) is preserved so the saved event spans 10th-12th.
    expect(end).toEqual(exclusiveEnd);
  });

  it("keeps the exclusive next-day end for a single-day all-day selection", () => {
    const start = new Date(2026, 5, 10, 0, 0, 0);
    const exclusiveEnd = new Date(2026, 5, 11, 0, 0, 0); // next day, exclusive

    const { start: rangeStart, end, allDay } = getSelectionRange({
      start,
      end: exclusiveEnd,
      allDay: true,
    });

    expect(allDay).toBe(true);
    expect(rangeStart).toEqual(start);
    expect(end).toEqual(exclusiveEnd);
  });

  it("leaves a timed (non-all-day) selection unchanged", () => {
    const start = new Date(2026, 5, 10, 9, 0, 0);
    const end = new Date(2026, 5, 10, 10, 30, 0);

    const result = getSelectionRange({ start, end, allDay: false });

    expect(result.allDay).toBe(false);
    expect(result.start).toEqual(start);
    expect(result.end).toEqual(end);
  });

  it("does not shift the all-day end across a spring-forward DST window", () => {
    // No date arithmetic is performed, so even a range whose end lands the day
    // after a 23-hour (spring-forward) day keeps the exact exclusive end.
    // 2026-03-08 is the US spring-forward date; an exclusive end of 2026-03-09
    // must remain 2026-03-09, not be nudged to the 8th.
    const start = new Date(2026, 2, 7, 0, 0, 0); // Sat Mar 7 2026
    const exclusiveEnd = new Date(2026, 2, 9, 0, 0, 0); // Mon Mar 9 2026 (exclusive)

    const { end } = getSelectionRange({
      start,
      end: exclusiveEnd,
      allDay: true,
    });

    expect(end).toEqual(exclusiveEnd);
    expect(end.getDate()).toBe(9);
  });
});
