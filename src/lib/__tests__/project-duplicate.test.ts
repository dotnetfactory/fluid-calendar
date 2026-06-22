import {
  DuplicableTask,
  buildDuplicatedTaskData,
} from "@/lib/projects/duplicate";

function makeSourceTask(
  overrides: Partial<DuplicableTask> = {}
): DuplicableTask {
  return {
    id: "src-task-1",
    title: "Write script",
    description: "Draft the video script",
    status: "todo",
    dueDate: new Date("2026-07-01T00:00:00.000Z"),
    startDate: new Date("2026-06-25T00:00:00.000Z"),
    duration: 60,
    priority: "high",
    energyLevel: "medium",
    preferredTime: "morning",
    isRecurring: true,
    recurrenceRule: "FREQ=WEEKLY",
    // instance/sync state that must NOT be cloned
    isAutoScheduled: true,
    scheduleLocked: true,
    scheduledStart: new Date("2026-06-26T09:00:00.000Z"),
    scheduledEnd: new Date("2026-06-26T10:00:00.000Z"),
    scheduleScore: 0.9,
    lastScheduled: new Date("2026-06-20T00:00:00.000Z"),
    postponedUntil: new Date("2026-06-30T00:00:00.000Z"),
    blockEventId: "evt-123",
    blockFeedId: "feed-123",
    blockDirty: true,
    completedAt: null,
    lastCompletedDate: new Date("2026-06-10T00:00:00.000Z"),
    externalTaskId: "ext-1",
    source: "OUTLOOK",
    externalListId: "list-1",
    externalCreatedAt: new Date("2026-06-01T00:00:00.000Z"),
    externalUpdatedAt: new Date("2026-06-05T00:00:00.000Z"),
    lastSyncedAt: new Date("2026-06-05T00:00:00.000Z"),
    syncStatus: "synced",
    syncError: null,
    syncHash: "hash-abc",
    skipSync: true,
    userId: "original-owner",
    tags: [{ id: "tag-1" }, { id: "tag-2" }],
    ...overrides,
  };
}

describe("buildDuplicatedTaskData", () => {
  const NEW_PROJECT_ID = "new-project-1";
  const REQUESTER = "requester-user";

  it("carries over template-relevant fields", () => {
    const src = makeSourceTask();
    const data = buildDuplicatedTaskData(src, NEW_PROJECT_ID, REQUESTER);

    expect(data.title).toBe("Write script");
    expect(data.description).toBe("Draft the video script");
    expect(data.status).toBe("todo");
    expect(data.dueDate).toEqual(src.dueDate);
    expect(data.startDate).toEqual(src.startDate);
    expect(data.duration).toBe(60);
    expect(data.priority).toBe("high");
    expect(data.energyLevel).toBe("medium");
    expect(data.preferredTime).toBe("morning");
    expect(data.isRecurring).toBe(true);
    expect(data.recurrenceRule).toBe("FREQ=WEEKLY");
  });

  it("assigns the new project and the requesting user (not the source owner)", () => {
    const data = buildDuplicatedTaskData(
      makeSourceTask(),
      NEW_PROJECT_ID,
      REQUESTER
    );
    expect(data.projectId).toBe(NEW_PROJECT_ID);
    expect(data.userId).toBe(REQUESTER);
    expect(data.userId).not.toBe("original-owner");
  });

  it("does not copy the source id", () => {
    const data = buildDuplicatedTaskData(
      makeSourceTask(),
      NEW_PROJECT_ID,
      REQUESTER
    ) as Record<string, unknown>;
    expect(data.id).toBeUndefined();
  });

  it("resets external-sync state", () => {
    const data = buildDuplicatedTaskData(
      makeSourceTask(),
      NEW_PROJECT_ID,
      REQUESTER
    );
    expect(data.externalTaskId ?? null).toBeNull();
    expect(data.source ?? null).toBeNull();
    expect(data.externalListId ?? null).toBeNull();
    expect(data.externalCreatedAt ?? null).toBeNull();
    expect(data.externalUpdatedAt ?? null).toBeNull();
    expect(data.lastSyncedAt ?? null).toBeNull();
    expect(data.syncStatus ?? null).toBeNull();
    expect(data.syncError ?? null).toBeNull();
    expect(data.syncHash ?? null).toBeNull();
    expect(data.skipSync ?? false).toBe(false);
  });

  it("resets auto-schedule artifacts", () => {
    const data = buildDuplicatedTaskData(
      makeSourceTask(),
      NEW_PROJECT_ID,
      REQUESTER
    );
    expect(data.isAutoScheduled ?? false).toBe(false);
    expect(data.scheduleLocked ?? false).toBe(false);
    expect(data.scheduledStart ?? null).toBeNull();
    expect(data.scheduledEnd ?? null).toBeNull();
    expect(data.scheduleScore ?? null).toBeNull();
    expect(data.lastScheduled ?? null).toBeNull();
  });

  it("resets calendar-block references", () => {
    const data = buildDuplicatedTaskData(
      makeSourceTask(),
      NEW_PROJECT_ID,
      REQUESTER
    );
    expect(data.blockEventId ?? null).toBeNull();
    expect(data.blockFeedId ?? null).toBeNull();
    expect(data.blockDirty ?? false).toBe(false);
  });

  it("resets lifecycle timestamps", () => {
    const data = buildDuplicatedTaskData(
      makeSourceTask(),
      NEW_PROJECT_ID,
      REQUESTER
    );
    expect(data.completedAt ?? null).toBeNull();
    expect(data.lastCompletedDate ?? null).toBeNull();
    expect(data.postponedUntil ?? null).toBeNull();
  });

  it("connects existing tags by id (does not create new tag records)", () => {
    const data = buildDuplicatedTaskData(
      makeSourceTask(),
      NEW_PROJECT_ID,
      REQUESTER
    );
    expect(data.tags).toEqual({
      connect: [{ id: "tag-1" }, { id: "tag-2" }],
    });
  });

  it("omits the tags connect clause when there are no tags", () => {
    const data = buildDuplicatedTaskData(
      makeSourceTask({ tags: [] }),
      NEW_PROJECT_ID,
      REQUESTER
    );
    expect(data.tags).toBeUndefined();
  });
});
