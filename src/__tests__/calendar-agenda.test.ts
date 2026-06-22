import { formatAgendaItems, resolveEventDeleteMode } from "@/lib/calendar-agenda";

import { CalendarEvent, CalendarFeed } from "@/types/calendar";

// Minimal CalendarEvent factory for the agenda formatter tests. The formatter
// only reads a subset of fields, so we cast a partial through unknown.
function makeItem(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: "evt-1",
    feedId: "feed-1",
    title: "Event",
    start: new Date(2026, 5, 10, 9, 0, 0),
    end: new Date(2026, 5, 10, 10, 0, 0),
    isRecurring: false,
    isMaster: false,
    allDay: false,
    ...overrides,
  } as CalendarEvent;
}

function makeFeed(overrides: Partial<CalendarFeed>): CalendarFeed {
  return {
    id: "feed-1",
    name: "Feed",
    type: "GOOGLE",
    color: "#abcdef",
    enabled: true,
    ...overrides,
  } as CalendarFeed;
}

describe("formatAgendaItems", () => {
  it("includes task items (feedId 'tasks') even when no matching feed exists", () => {
    const task = makeItem({
      id: "task-1",
      feedId: "tasks",
      title: "Do the thing",
      color: "#112233",
      extendedProps: { isTask: true, status: "TODO", priority: "high" },
    });

    const result = formatAgendaItems([task], []);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("task-1");
    expect(result[0].extendedProps?.isTask).toBe(true);
  });

  it("excludes events whose feed is disabled", () => {
    const event = makeItem({ feedId: "feed-1" });
    const disabledFeed = makeFeed({ id: "feed-1", enabled: false });

    const result = formatAgendaItems([event], [disabledFeed]);

    expect(result).toHaveLength(0);
  });

  it("excludes events whose feed is missing entirely", () => {
    const event = makeItem({ feedId: "ghost-feed" });

    const result = formatAgendaItems([event], []);

    expect(result).toHaveLength(0);
  });

  it("includes events whose feed is enabled", () => {
    const event = makeItem({ feedId: "feed-1" });
    const enabledFeed = makeFeed({ id: "feed-1", enabled: true });

    const result = formatAgendaItems([event], [enabledFeed]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("evt-1");
  });

  it("resolves event color from its feed, falling back to the default event color", () => {
    const colored = makeItem({ id: "a", feedId: "feed-1" });
    const colorless = makeItem({ id: "b", feedId: "feed-2" });
    const feeds = [
      makeFeed({ id: "feed-1", color: "#abcdef", enabled: true }),
      makeFeed({ id: "feed-2", color: undefined, enabled: true }),
    ];

    const result = formatAgendaItems([colored, colorless], feeds);
    const a = result.find((r) => r.id === "a")!;
    const b = result.find((r) => r.id === "b")!;

    expect(a.backgroundColor).toBe("#abcdef");
    expect(a.borderColor).toBe("#abcdef");
    expect(b.backgroundColor).toBe("#3b82f6");
    expect(b.borderColor).toBe("#3b82f6");
  });

  it("resolves task color from the item color, falling back to the default task color", () => {
    const colored = makeItem({
      id: "t1",
      feedId: "tasks",
      color: "#112233",
      extendedProps: { isTask: true },
    });
    const colorless = makeItem({
      id: "t2",
      feedId: "tasks",
      color: undefined,
      extendedProps: { isTask: true },
    });

    const result = formatAgendaItems([colored, colorless], []);
    const t1 = result.find((r) => r.id === "t1")!;
    const t2 = result.find((r) => r.id === "t2")!;

    expect(t1.backgroundColor).toBe("#112233");
    expect(t2.backgroundColor).toBe("#4f46e5");
  });

  it("preserves extendedProps (isTask, status, priority, isRecurring)", () => {
    const task = makeItem({
      id: "task-1",
      feedId: "tasks",
      isRecurring: true,
      extendedProps: {
        isTask: true,
        status: "IN_PROGRESS",
        priority: "high",
      },
    });

    const result = formatAgendaItems([task], []);

    expect(result[0].extendedProps?.isTask).toBe(true);
    expect(result[0].extendedProps?.status).toBe("IN_PROGRESS");
    expect(result[0].extendedProps?.priority).toBe("high");
    expect(result[0].extendedProps?.isRecurring).toBe(true);
  });

  it("tags task items with the calendar-task class and events with calendar-event", () => {
    const task = makeItem({
      id: "t",
      feedId: "tasks",
      extendedProps: { isTask: true },
    });
    const event = makeItem({ id: "e", feedId: "feed-1" });
    const feeds = [makeFeed({ id: "feed-1", enabled: true })];

    const result = formatAgendaItems([task, event], feeds);
    const t = result.find((r) => r.id === "t")!;
    const e = result.find((r) => r.id === "e")!;

    expect(t.classNames).toContain("calendar-task");
    expect(e.classNames).toContain("calendar-event");
  });

  it("sorts the result by start time ascending", () => {
    const feeds = [makeFeed({ id: "feed-1", enabled: true })];
    const later = makeItem({
      id: "later",
      feedId: "feed-1",
      start: new Date(2026, 5, 10, 15, 0, 0),
      end: new Date(2026, 5, 10, 16, 0, 0),
    });
    const earlier = makeItem({
      id: "earlier",
      feedId: "feed-1",
      start: new Date(2026, 5, 10, 8, 0, 0),
      end: new Date(2026, 5, 10, 9, 0, 0),
    });

    const result = formatAgendaItems([later, earlier], feeds);

    expect(result.map((r) => r.id)).toEqual(["earlier", "later"]);
  });
});

describe("resolveEventDeleteMode", () => {
  it("returns 'single' for a non-recurring event", () => {
    const event = makeItem({ isRecurring: false });
    expect(resolveEventDeleteMode(event)).toBe("single");
  });

  it("returns 'single' for a recurring occurrence (instance row, not the master)", () => {
    // An expanded occurrence is recurring but is NOT the master; deleting it
    // must remove only that occurrence, never the whole series.
    const occurrence = makeItem({
      isRecurring: true,
      isMaster: false,
      masterEventId: "master-1",
    });
    expect(resolveEventDeleteMode(occurrence)).toBe("single");
  });

  it("returns 'series' only for the recurring master event", () => {
    const master = makeItem({ isRecurring: true, isMaster: true });
    expect(resolveEventDeleteMode(master)).toBe("series");
  });
});
