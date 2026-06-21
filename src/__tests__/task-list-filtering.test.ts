import { addDays, newDate, startOfDay } from "@/lib/date-utils";

import {
  isUpcomingTask,
  taskMatchesListFilters,
} from "@/components/tasks/utils/task-list-utils";

import { Task, TaskStatus } from "@/types/task";

// Minimal Task factory: only the fields the list filter inspects matter; the
// rest are filled with inert defaults so the object satisfies the Task type.
function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    title: "Test task",
    status: TaskStatus.TODO,
    tags: [],
    createdAt: newDate(),
    updatedAt: newDate(),
    isRecurring: false,
    isAutoScheduled: false,
    scheduleLocked: false,
    ...overrides,
  };
}

describe("isUpcomingTask", () => {
  it("returns true when startDate is on a later calendar day", () => {
    const tomorrow = addDays(startOfDay(newDate()), 1);
    expect(isUpcomingTask(makeTask({ startDate: tomorrow }))).toBe(true);
  });

  it("returns false when startDate is later today (same calendar day)", () => {
    // 23:59 today is after `now` as an instant but is NOT a future day, so the
    // task should NOT be treated as upcoming (matches the "Upcoming" badge).
    const laterToday = addDays(startOfDay(newDate()), 1);
    laterToday.setMilliseconds(laterToday.getMilliseconds() - 1); // last ms of today
    expect(isUpcomingTask(makeTask({ startDate: laterToday }))).toBe(false);
  });

  it("returns false when startDate is the start of today", () => {
    expect(isUpcomingTask(makeTask({ startDate: startOfDay(newDate()) }))).toBe(
      false
    );
  });

  it("returns false when startDate is on a previous calendar day", () => {
    const yesterday = addDays(startOfDay(newDate()), -1);
    expect(isUpcomingTask(makeTask({ startDate: yesterday }))).toBe(false);
  });

  it("returns false when there is no startDate", () => {
    expect(isUpcomingTask(makeTask({ startDate: null }))).toBe(false);
    expect(isUpcomingTask(makeTask({ startDate: undefined }))).toBe(false);
  });
});

describe("taskMatchesListFilters - hide upcoming tasks", () => {
  const tomorrow = addDays(startOfDay(newDate()), 1);
  const laterToday = (() => {
    const d = addDays(startOfDay(newDate()), 1);
    d.setMilliseconds(d.getMilliseconds() - 1);
    return d;
  })();

  it("hides a future-day task when hideUpcomingTasks is on", () => {
    expect(
      taskMatchesListFilters(makeTask({ startDate: tomorrow }), {
        hideUpcomingTasks: true,
      })
    ).toBe(false);
  });

  it("keeps a later-today task when hideUpcomingTasks is on", () => {
    expect(
      taskMatchesListFilters(makeTask({ startDate: laterToday }), {
        hideUpcomingTasks: true,
      })
    ).toBe(true);
  });

  it("keeps a task with no startDate when hideUpcomingTasks is on", () => {
    expect(
      taskMatchesListFilters(makeTask({ startDate: null }), {
        hideUpcomingTasks: true,
      })
    ).toBe(true);
  });

  it("keeps a future-day task when hideUpcomingTasks is off", () => {
    expect(
      taskMatchesListFilters(makeTask({ startDate: tomorrow }), {
        hideUpcomingTasks: false,
      })
    ).toBe(true);
  });
});

describe("taskMatchesListFilters - other predicates are preserved", () => {
  it("filters by status", () => {
    const task = makeTask({ status: TaskStatus.COMPLETED });
    expect(
      taskMatchesListFilters(task, { status: [TaskStatus.TODO] })
    ).toBe(false);
    expect(
      taskMatchesListFilters(task, { status: [TaskStatus.COMPLETED] })
    ).toBe(true);
  });

  it("filters by search across title", () => {
    const task = makeTask({ title: "Buy groceries" });
    expect(taskMatchesListFilters(task, { search: "groc" })).toBe(true);
    expect(taskMatchesListFilters(task, { search: "xyz" })).toBe(false);
  });

  it("matches everything when no filters are provided", () => {
    expect(taskMatchesListFilters(makeTask(), {})).toBe(true);
  });
});
