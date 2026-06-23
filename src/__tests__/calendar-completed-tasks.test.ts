import { useCalendarStore } from "@/store/calendar";
import { useTaskStore } from "@/store/task";

import { TaskStatus } from "@/types/task";

/**
 * Completed auto-scheduled tasks should stay on the calendar (drawn dimmed),
 * rather than vanishing, so the day reflects what was actually done. Completed
 * tasks WITHOUT a scheduled slot stay hidden so views aren't flooded.
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
  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useTaskStore.setState({ tasks: [] } as any);
  });

  it("keeps a completed auto-scheduled task at its slot (so it can render dimmed)", () => {
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
