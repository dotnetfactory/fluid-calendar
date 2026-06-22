import { CalDAVFieldMapper } from "@/lib/task-sync/providers/caldav-field-mapper";

import { Priority, TaskStatus } from "@/types/task";

import { ExternalTask } from "@/lib/task-sync/providers/task-provider.interface";

/**
 * Unit tests for the CalDAV field mapper (GitHub issue #144). It translates
 * VTODO status/priority enums into FluidCalendar's TaskStatus/Priority while
 * carrying dates and recurrence through.
 */
function externalTask(overrides: Partial<ExternalTask>): ExternalTask {
  return {
    id: "uid-1",
    title: "A task",
    listId: "list-1",
    ...overrides,
  };
}

describe("CalDAVFieldMapper.mapToInternalTask (issue #144)", () => {
  const mapper = new CalDAVFieldMapper();

  it("maps VTODO STATUS:COMPLETED to TaskStatus.COMPLETED", () => {
    const internal = mapper.mapToInternalTask(
      externalTask({ status: "COMPLETED" }),
      "project-1"
    );
    expect(internal.status).toBe(TaskStatus.COMPLETED);
    expect(internal.projectId).toBe("project-1");
  });

  it("maps an absent / NEEDS-ACTION status to TaskStatus.TODO", () => {
    expect(
      mapper.mapToInternalTask(externalTask({ status: "NEEDS-ACTION" }), "p")
        .status
    ).toBe(TaskStatus.TODO);
    expect(
      mapper.mapToInternalTask(externalTask({}), "p").status
    ).toBe(TaskStatus.TODO);
  });

  it("maps a high VTODO PRIORITY (1-4) to Priority.HIGH", () => {
    expect(
      mapper.mapToInternalTask(externalTask({ priority: "1" }), "p").priority
    ).toBe(Priority.HIGH);
  });

  it("maps PRIORITY 0 / absent to Priority.NONE", () => {
    expect(
      mapper.mapToInternalTask(externalTask({ priority: "0" }), "p").priority
    ).toBe(Priority.NONE);
    expect(
      mapper.mapToInternalTask(externalTask({}), "p").priority
    ).toBe(Priority.NONE);
  });

  it("carries due date and recurrence through to the internal task", () => {
    const due = new Date("2025-07-01T12:00:00.000Z");
    const internal = mapper.mapToInternalTask(
      externalTask({
        dueDate: due,
        isRecurring: true,
        recurrenceRule: "FREQ=WEEKLY",
      }),
      "p"
    );
    expect(internal.dueDate).toEqual(due);
    expect(internal.isRecurring).toBe(true);
    expect(internal.recurrenceRule).toBe("FREQ=WEEKLY");
  });
});
