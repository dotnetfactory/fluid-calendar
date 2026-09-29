import { computeDropUpdate, DragChange } from "@/lib/calendar-drag";
import { getEventEditability, isWritableFeedType } from "@/lib/calendar-drag";
import { CalendarEvent, CalendarFeed } from "@/types/calendar";

const googleFeed: CalendarFeed = {
  id: "feed-1",
  name: "Personal",
  type: "GOOGLE",
  enabled: true,
};

const feeds = [googleFeed];

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "evt-1",
    feedId: "feed-1",
    title: "Standup",
    start: new Date("2026-06-12T15:00:00.000Z"),
    end: new Date("2026-06-12T15:30:00.000Z"),
    isRecurring: false,
    allDay: false,
    isMaster: false,
    ...overrides,
  };
}

function makeTaskItem(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return makeEvent({
    id: "task-1",
    feedId: "tasks",
    extendedProps: {
      isTask: true,
      taskId: "task-1",
      // getTasksAsEvents adds this beyond the ExtendedEventProps interface
      isAutoScheduled: true,
    } as CalendarEvent["extendedProps"],
    ...overrides,
  });
}

function makeChange(
  item: CalendarEvent,
  overrides: Partial<DragChange> = {}
): DragChange {
  return {
    item,
    newStart: new Date("2026-06-12T16:00:00.000Z"),
    newEnd: new Date("2026-06-12T16:30:00.000Z"),
    oldStart: new Date("2026-06-12T15:00:00.000Z"),
    oldEnd: new Date("2026-06-12T15:30:00.000Z"),
    oldAllDay: false,
    newAllDay: false,
    isResize: false,
    ...overrides,
  };
}

describe("computeDropUpdate", () => {
  it("moves an auto-scheduled task and pins it", () => {
    const result = computeDropUpdate(makeChange(makeTaskItem()), feeds);

    expect(result.kind).toBe("task");
    if (result.kind !== "task") return;
    expect(result.taskId).toBe("task-1");
    expect(result.updates.scheduledStart).toEqual(
      new Date("2026-06-12T16:00:00.000Z")
    );
    expect(result.updates.scheduledEnd).toEqual(
      new Date("2026-06-12T16:30:00.000Z")
    );
    expect(result.updates.scheduleLocked).toBe(true);
    expect(result.updates.isAutoScheduled).toBe(true);
    expect(result.updates.duration).toBeUndefined();
  });

  it("updates task duration on resize", () => {
    const result = computeDropUpdate(
      makeChange(makeTaskItem(), {
        newEnd: new Date("2026-06-12T17:30:00.000Z"),
        isResize: true,
      }),
      feeds
    );

    expect(result.kind).toBe("task");
    if (result.kind !== "task") return;
    expect(result.updates.duration).toBe(90);
  });

  it("blocks tasks that are not auto-scheduled", () => {
    const item = makeTaskItem({
      extendedProps: {
        isTask: true,
        taskId: "task-1",
        isAutoScheduled: false,
      } as CalendarEvent["extendedProps"],
    });

    const result = computeDropUpdate(makeChange(item), feeds);
    expect(result.kind).toBe("blocked");
  });

  it("blocks all-day <-> timed transitions", () => {
    const result = computeDropUpdate(
      makeChange(makeTaskItem(), { oldAllDay: false, newAllDay: true }),
      feeds
    );
    expect(result.kind).toBe("blocked");
  });

  it("moves a non-recurring event on a writable feed without a recurrence mode", () => {
    const result = computeDropUpdate(makeChange(makeEvent()), feeds);

    expect(result.kind).toBe("event");
    if (result.kind !== "event") return;
    expect(result.eventId).toBe("evt-1");
    expect(result.updates.start).toEqual(new Date("2026-06-12T16:00:00.000Z"));
    expect(result.updates.end).toEqual(new Date("2026-06-12T16:30:00.000Z"));
    expect(result.updates.allDay).toBe(false);
    expect("mode" in result).toBe(false);
  });

  it("moves a recurring instance as a direct patch of its own event id", () => {
    // The instance row carries its instance-specific external id, so the API
    // patches exactly this occurrence; mode "single" would re-resolve the
    // instance by the NEW start time and can hit the wrong occurrence
    const item = makeEvent({
      id: "evt-instance",
      isRecurring: true,
      isMaster: false,
      masterEventId: "evt-master",
    });

    const result = computeDropUpdate(makeChange(item), feeds);
    expect(result.kind).toBe("event");
    if (result.kind !== "event") return;
    expect(result.eventId).toBe("evt-instance");
    expect("mode" in result).toBe(false);
  });

  it("blocks events whose feed is missing", () => {
    const item = makeEvent({ feedId: "feed-gone" });
    const result = computeDropUpdate(makeChange(item), feeds);
    expect(result.kind).toBe("blocked");
  });

  it("preserves the previous duration when FullCalendar reports a null end", () => {
    const result = computeDropUpdate(
      makeChange(makeEvent(), { newEnd: null }),
      feeds
    );

    expect(result.kind).toBe("event");
    if (result.kind !== "event") return;
    // old duration was 30 minutes
    expect(result.updates.end).toEqual(new Date("2026-06-12T16:30:00.000Z"));
  });
});

describe("getEventEditability", () => {
  it("makes auto-scheduled task blocks fully editable", () => {
    expect(getEventEditability(makeTaskItem(), feeds)).toEqual({
      startEditable: true,
      durationEditable: true,
    });
  });

  it("locks non-auto-scheduled task chips", () => {
    const item = makeTaskItem({
      allDay: true,
      extendedProps: {
        isTask: true,
        taskId: "task-1",
        isAutoScheduled: false,
      } as CalendarEvent["extendedProps"],
    });

    expect(getEventEditability(item, feeds)).toEqual({
      startEditable: false,
      durationEditable: false,
    });
  });

  it("makes events on writable feeds editable", () => {
    expect(getEventEditability(makeEvent(), feeds)).toEqual({
      startEditable: true,
      durationEditable: true,
    });
  });

  it("locks all-day events", () => {
    expect(getEventEditability(makeEvent({ allDay: true }), feeds)).toEqual({
      startEditable: false,
      durationEditable: false,
    });
  });

  it("locks events whose feed is unknown", () => {
    expect(
      getEventEditability(makeEvent({ feedId: "feed-gone" }), feeds)
    ).toEqual({
      startEditable: false,
      durationEditable: false,
    });
  });

  it("locks events on read-only iCal feeds", () => {
    const icalFeed: CalendarFeed = {
      id: "feed-ical",
      name: "Bundesliga",
      type: "ICAL",
      enabled: true,
    };
    const item = makeEvent({ feedId: "feed-ical" });
    expect(getEventEditability(item, [icalFeed])).toEqual({
      startEditable: false,
      durationEditable: false,
    });
    expect(computeDropUpdate(makeChange(item), [icalFeed])).toEqual({
      kind: "blocked",
      reason: "This calendar is read-only",
    });
  });
});

describe("isWritableFeedType", () => {
  it("treats Google/Outlook/CalDAV as writable", () => {
    expect(isWritableFeedType("GOOGLE")).toBe(true);
    expect(isWritableFeedType("OUTLOOK")).toBe(true);
    expect(isWritableFeedType("CALDAV")).toBe(true);
  });

  it("treats iCal subscriptions as read-only", () => {
    // The server event routes branch on this to reject create/update/delete.
    expect(isWritableFeedType("ICAL")).toBe(false);
  });

  it("treats unknown/missing types as read-only", () => {
    expect(isWritableFeedType("LOCAL")).toBe(false);
    expect(isWritableFeedType(null)).toBe(false);
    expect(isWritableFeedType(undefined)).toBe(false);
  });
});
