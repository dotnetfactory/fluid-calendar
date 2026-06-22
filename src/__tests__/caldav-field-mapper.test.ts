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

  it("maps completedDate to completedAt", () => {
    const completed = new Date("2025-07-02T09:00:00.000Z");
    const internal = mapper.mapToInternalTask(
      externalTask({ status: "COMPLETED", completedDate: completed }),
      "p"
    );
    expect(internal.completedAt).toEqual(completed);
  });
});

/**
 * CalDAV import is one-way: when an external-owned field is removed/reset
 * upstream (e.g. a completed task is reopened, a due date is cleared), the local
 * task must clear it too rather than retaining a stale value (issue #144 review).
 */
describe("CalDAVFieldMapper.mergeTaskData clears external-owned fields (issue #144)", () => {
  const mapper = new CalDAVFieldMapper();

  function localTask(overrides: Record<string, unknown>) {
    return {
      id: "local-1",
      title: "Old title",
      tags: [],
      project: null,
      ...overrides,
    } as never;
  }

  it("clears completedAt when a VTODO is reopened (COMPLETED removed)", () => {
    const local = localTask({
      status: TaskStatus.COMPLETED,
      completedAt: new Date("2025-01-01T00:00:00.000Z"),
    });
    // External read: reopened task -> NEEDS-ACTION, no completion date.
    const incoming = mapper.mapToInternalTask(
      externalTask({ status: "NEEDS-ACTION", completedDate: null }),
      "p"
    );
    const merged = mapper.mergeTaskData(local, incoming);
    expect(merged.status).toBe(TaskStatus.TODO);
    expect(merged.completedAt).toBeNull();
  });

  it("clears dueDate, description and recurrence when removed upstream", () => {
    const local = localTask({
      dueDate: new Date("2025-01-01T00:00:00.000Z"),
      description: "old notes",
      isRecurring: true,
      recurrenceRule: "FREQ=WEEKLY",
    });
    const incoming = mapper.mapToInternalTask(
      externalTask({
        dueDate: null,
        description: null,
        isRecurring: false,
        recurrenceRule: null,
      }),
      "p"
    );
    const merged = mapper.mergeTaskData(local, incoming);
    expect(merged.dueDate).toBeNull();
    expect(merged.description).toBeNull();
    expect(merged.isRecurring).toBe(false);
    expect(merged.recurrenceRule).toBeNull();
  });

  it("preserves local-owned startDate even when absent upstream", () => {
    const start = new Date("2025-03-01T08:00:00.000Z");
    const local = localTask({ startDate: start });
    const incoming = mapper.mapToInternalTask(
      externalTask({ startDate: null }),
      "p"
    );
    const merged = mapper.mergeTaskData(local, incoming);
    expect(merged.startDate).toEqual(start);
  });

  it("preserves local-owned startDate even when the VTODO has a DTSTART", () => {
    const localStart = new Date("2025-03-01T08:00:00.000Z");
    const serverStart = new Date("2025-09-09T09:00:00.000Z");
    const local = localTask({ startDate: localStart });
    // The server provides a (non-null) DTSTART; it must NOT overwrite the
    // user's local start date, which is local-owned.
    const incoming = mapper.mapToInternalTask(
      externalTask({ startDate: serverStart }),
      "p"
    );
    const merged = mapper.mergeTaskData(local, incoming);
    expect(merged.startDate).toEqual(localStart);
  });
});
