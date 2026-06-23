import { useCalendarStore } from "@/store/calendar";
import { useCalendarViewSettings } from "@/store/calendarViewSettings";
import { useTaskStore } from "@/store/task";

import { TaskStatus } from "@/types/task";

/**
 * Completed auto-scheduled tasks are hidden from the calendar by default
 * (Motion-style) so finishing one visibly frees its slot. The "Show completed"
 * toggle brings them back, drawn dimmed. Completed tasks WITHOUT a scheduled
 * slot stay hidden either way so views aren't flooded.
 */

// A 9am–9:30am slot "today" and the day window around it.
const dayStart = new Date(2026, 5, 23, 0, 0, 0, 0);
const dayEnd = new Date(2026, 5, 23, 23, 59, 59, 999);
const slotStart = new Date(2026, 5, 23, 9, 0, 0, 0);
const slotEnd = new Date(2026, 5, 23, 9, 30, 0, 0);

function task(overrides: Record<string, unknown>) {
  return {
    id: "t",
    title: "Task",
    description: null,
    status: TaskStatus.TODO,
    isAutoScheduled: false,
    scheduledStart: null,
    scheduledEnd: null,
    dueDate: null,
    isRecurring: false,
    tags: [],
    priority: null,
    energyLevel: null,
    preferredTime: null,
    ...overrides,
  };
}

function eventsForDay() {
  return useCalendarStore.getState().getTasksAsEvents(dayStart, dayEnd);
}

describe("getTasksAsEvents — completed tasks", () => {
  beforeEach(() => {
    useCalendarViewSettings.setState({ showCompletedTasks: false });
  });
  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useTaskStore.setState({ tasks: [] } as any);
    useCalendarViewSettings.setState({ showCompletedTasks: false });
  });

  it("hides a completed auto-scheduled task by default (frees its slot)", () => {
    useTaskStore.setState({
      tasks: [
        task({
          id: "done-default",
          status: TaskStatus.COMPLETED,
          isAutoScheduled: true,
          scheduledStart: slotStart,
          scheduledEnd: slotEnd,
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any,
    });

    expect(
      eventsForDay().some((e) => e.extendedProps?.taskId === "done-default")
    ).toBe(false);
  });

  it("shows a completed auto-scheduled task when the toggle is on (dimmed)", () => {
    useCalendarViewSettings.setState({ showCompletedTasks: true });
    useTaskStore.setState({
      tasks: [
        task({
          id: "done",
          status: TaskStatus.COMPLETED,
          isAutoScheduled: true,
          scheduledStart: slotStart,
          scheduledEnd: slotEnd,
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any,
    });

    const events = eventsForDay();
    const done = events.find((e) => e.extendedProps?.taskId === "done");
    expect(done).toBeDefined();
    expect(done?.extendedProps?.status).toBe(TaskStatus.COMPLETED);
  });

  it("still shows an incomplete auto-scheduled task at its slot", () => {
    useTaskStore.setState({
      tasks: [
        task({
          id: "todo",
          status: TaskStatus.TODO,
          isAutoScheduled: true,
          scheduledStart: slotStart,
          scheduledEnd: slotEnd,
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any,
    });

    expect(
      eventsForDay().some((e) => e.extendedProps?.taskId === "todo")
    ).toBe(true);
  });

  it("hides a completed task that has no scheduled slot (only a due date)", () => {
    useTaskStore.setState({
      tasks: [
        task({
          id: "done-unscheduled",
          status: TaskStatus.COMPLETED,
          isAutoScheduled: false,
          dueDate: slotStart,
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any,
    });

    expect(
      eventsForDay().some((e) => e.extendedProps?.taskId === "done-unscheduled")
    ).toBe(false);
  });
});
