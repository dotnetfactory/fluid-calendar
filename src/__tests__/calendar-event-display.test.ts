import {
  formatEventTime,
  getMonthEventDisplay,
  isDayGridView,
} from "@/lib/calendar-event-display";

// Dates are built with the local-time constructor (year, monthIndex, day, hour,
// minute) so the formatted output is independent of the machine's time zone.

describe("formatEventTime", () => {
  it("formats an afternoon time in 12-hour mode", () => {
    expect(formatEventTime(new Date(2026, 5, 12, 15, 30), "12h")).toBe(
      "3:30 PM"
    );
  });

  it("formats an afternoon time in 24-hour mode", () => {
    expect(formatEventTime(new Date(2026, 5, 12, 15, 30), "24h")).toBe("15:30");
  });

  it("formats midnight in 12-hour mode as 12:00 AM", () => {
    expect(formatEventTime(new Date(2026, 5, 12, 0, 0), "12h")).toBe(
      "12:00 AM"
    );
  });

  it("formats noon in 12-hour mode as 12:00 PM", () => {
    expect(formatEventTime(new Date(2026, 5, 12, 12, 0), "12h")).toBe(
      "12:00 PM"
    );
  });

  it("zero-pads hours and minutes in 24-hour mode", () => {
    expect(formatEventTime(new Date(2026, 5, 12, 9, 5), "24h")).toBe("09:05");
  });

  it("zero-pads minutes in 12-hour mode", () => {
    expect(formatEventTime(new Date(2026, 5, 12, 9, 5), "12h")).toBe("9:05 AM");
  });

  it("defaults to local time when no time zone is given", () => {
    // Built with the local-time constructor, so the local-zone result is
    // deterministic regardless of the machine's time zone.
    expect(formatEventTime(new Date(2026, 5, 12, 15, 30), "12h")).toBe(
      "3:30 PM"
    );
  });

  it("treats an explicit \"local\" time zone the same as the default", () => {
    expect(formatEventTime(new Date(2026, 5, 12, 15, 30), "12h", "local")).toBe(
      "3:30 PM"
    );
  });
});

describe("formatEventTime with a configured time zone", () => {
  // A single absolute instant (built from UTC) renders as different wall-clock
  // times in different zones. Passing an explicit IANA zone makes the expected
  // output independent of the machine's local zone - this is the case where the
  // browser's local zone differs from the calendar's configured zone.
  const instant = new Date(Date.UTC(2026, 5, 12, 23, 30)); // 23:30Z, June (DST)

  it("formats the instant in America/New_York (UTC-4 in June)", () => {
    expect(formatEventTime(instant, "12h", "America/New_York")).toBe("7:30 PM");
    expect(formatEventTime(instant, "24h", "America/New_York")).toBe("19:30");
  });

  it("formats the same instant in Asia/Tokyo (UTC+9, next day)", () => {
    expect(formatEventTime(instant, "12h", "Asia/Tokyo")).toBe("8:30 AM");
    expect(formatEventTime(instant, "24h", "Asia/Tokyo")).toBe("08:30");
  });

  it("formats the same instant in UTC", () => {
    expect(formatEventTime(instant, "12h", "UTC")).toBe("11:30 PM");
    expect(formatEventTime(instant, "24h", "UTC")).toBe("23:30");
  });
});

describe("isDayGridView", () => {
  it("treats the month view as a day-grid view", () => {
    expect(isDayGridView("dayGridMonth")).toBe(true);
  });

  it("treats the multi-month view as a day-grid view", () => {
    expect(isDayGridView("multiMonthYear")).toBe(true);
  });

  it("does not treat the time-grid week view as a day-grid view", () => {
    expect(isDayGridView("timeGridWeek")).toBe(false);
  });

  it("does not treat the time-grid day view as a day-grid view", () => {
    expect(isDayGridView("timeGridDay")).toBe(false);
  });
});

describe("getMonthEventDisplay", () => {
  const base = {
    viewType: "dayGridMonth",
    allDay: false,
    isTask: false,
    start: new Date(2026, 5, 12, 15, 30),
    isStart: true,
    timeFormat: "12h" as const,
  };

  it("shows a colored time chip for a single-day timed event in month view", () => {
    const display = getMonthEventDisplay(base);
    expect(display.isDayGridTimed).toBe(true);
    expect(display.showTimeChip).toBe(true);
    expect(display.timeText).toBe("3:30 PM");
  });

  it("keeps the calendar identity but drops the time on a continuation segment", () => {
    // FullCalendar splits a multi-day event into one segment per day. Only the
    // first segment is the start, so later segments must not repeat the start
    // time, but they remain colored and so still need the accessible calendar
    // label exposed (isDayGridTimed stays true).
    const display = getMonthEventDisplay({ ...base, isStart: false });
    expect(display.isDayGridTimed).toBe(true);
    expect(display.showTimeChip).toBe(false);
    expect(display.timeText).toBe("");
  });

  it("is not a day-grid timed event for an all-day event", () => {
    const display = getMonthEventDisplay({ ...base, allDay: true });
    expect(display.isDayGridTimed).toBe(false);
    expect(display.showTimeChip).toBe(false);
    expect(display.timeText).toBe("");
  });

  it("is not a day-grid timed event for a task", () => {
    const display = getMonthEventDisplay({ ...base, isTask: true });
    expect(display.isDayGridTimed).toBe(false);
    expect(display.showTimeChip).toBe(false);
    expect(display.timeText).toBe("");
  });

  it("is not a day-grid timed event in the time-grid week view", () => {
    const display = getMonthEventDisplay({ ...base, viewType: "timeGridWeek" });
    expect(display.isDayGridTimed).toBe(false);
    expect(display.showTimeChip).toBe(false);
    expect(display.timeText).toBe("");
  });

  it("shows a time chip in the multi-month view", () => {
    const display = getMonthEventDisplay({
      ...base,
      viewType: "multiMonthYear",
    });
    expect(display.isDayGridTimed).toBe(true);
    expect(display.showTimeChip).toBe(true);
    expect(display.timeText).toBe("3:30 PM");
  });

  it("respects the 24-hour time format setting", () => {
    const display = getMonthEventDisplay({ ...base, timeFormat: "24h" });
    expect(display.showTimeChip).toBe(true);
    expect(display.timeText).toBe("15:30");
  });

  it("does not show a time chip when the start time is missing", () => {
    const display = getMonthEventDisplay({ ...base, start: null });
    expect(display.isDayGridTimed).toBe(false);
    expect(display.showTimeChip).toBe(false);
    expect(display.timeText).toBe("");
  });

  it("formats the time chip in the calendar's configured time zone", () => {
    // The chip must show whatever time the calendar itself renders, so it
    // formats in the time zone FullCalendar is configured with rather than the
    // browser's local zone.
    const display = getMonthEventDisplay({
      ...base,
      start: new Date(Date.UTC(2026, 5, 12, 23, 30)),
      timeZone: "America/New_York",
    });
    expect(display.showTimeChip).toBe(true);
    expect(display.timeText).toBe("7:30 PM");
  });
});
