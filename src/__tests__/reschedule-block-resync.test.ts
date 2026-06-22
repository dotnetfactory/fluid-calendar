import { prisma } from "@/lib/prisma";
import { SchedulingService } from "@/services/scheduling/SchedulingService";
import { scheduleAllTasksForUser } from "@/services/scheduling/TaskSchedulingService";

// Regression test for the reschedule push-sync gap: when the auto-scheduler
// MOVES a task that already has a pushed calendar block, the block must be
// flagged blockDirty so the caller's repushDirtyBlocks re-syncs the calendar
// event. Without the flag, repushDirtyBlocks (which only matches blockDirty or
// a not-yet-pushed schedule) skips it and the calendar event goes stale.

jest.mock("@/lib/prisma", () => ({
  prisma: {
    task: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    autoScheduleSettings: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/services/scheduling/SchedulingService");

jest.mock("@/lib/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockPrisma = prisma as unknown as {
  task: { findMany: jest.Mock; updateMany: jest.Mock };
  autoScheduleSettings: { findUnique: jest.Mock };
};
const MockScheduling = SchedulingService as unknown as jest.Mock;

const USER = "user-1";

function task(over: Record<string, unknown>) {
  return {
    id: "t",
    title: "T",
    blockEventId: null,
    scheduledStart: null,
    scheduledEnd: null,
    project: null,
    tags: [],
    status: "todo",
    priority: null,
    energyLevel: null,
    preferredTime: null,
    ...over,
  };
}

/** Find the updateMany call that flags moved blocks dirty, if any. */
function dirtyFlagCall() {
  return mockPrisma.task.updateMany.mock.calls.find(
    ([arg]) => arg?.data?.blockDirty === true
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.autoScheduleSettings.findUnique.mockResolvedValue({ userId: USER });
  mockPrisma.task.updateMany.mockResolvedValue({ count: 0 });
});

/**
 * Wire up the three findMany calls scheduleAllTasksForUser makes (tasksToSchedule,
 * lockedTasks, final fetch) plus the scheduler's returned post-replan tasks.
 */
function arrange(opts: {
  before: ReturnType<typeof task>[];
  after: ReturnType<typeof task>[];
}) {
  mockPrisma.task.findMany
    .mockResolvedValueOnce(opts.before) // tasksToSchedule (pre-clear positions)
    .mockResolvedValueOnce([]) // lockedTasks
    .mockResolvedValueOnce(opts.after); // final fetch for return value
  MockScheduling.mockImplementation(() => ({
    scheduleMultipleTasks: jest.fn().mockResolvedValue(opts.after),
  }));
}

describe("scheduleAllTasksForUser → block resync", () => {
  const start1 = new Date("2026-06-22T09:00:00Z");
  const end1 = new Date("2026-06-22T09:30:00Z");
  const start2 = new Date("2026-06-22T14:00:00Z");
  const end2 = new Date("2026-06-22T14:30:00Z");

  it("flags a moved, already-pushed task as blockDirty", async () => {
    arrange({
      before: [
        task({ id: "a", blockEventId: "evt-a", scheduledStart: start1, scheduledEnd: end1 }),
      ],
      after: [
        task({ id: "a", blockEventId: "evt-a", scheduledStart: start2, scheduledEnd: end2 }),
      ],
    });

    await scheduleAllTasksForUser(USER);

    const call = dirtyFlagCall();
    expect(call).toBeDefined();
    expect(call![0].where.id.in).toEqual(["a"]);
  });

  it("does NOT flag a task that landed in the same slot", async () => {
    arrange({
      before: [
        task({ id: "a", blockEventId: "evt-a", scheduledStart: start1, scheduledEnd: end1 }),
      ],
      after: [
        task({ id: "a", blockEventId: "evt-a", scheduledStart: start1, scheduledEnd: end1 }),
      ],
    });

    await scheduleAllTasksForUser(USER);

    expect(dirtyFlagCall()).toBeUndefined();
  });

  it("does NOT flag a moved task that has no block yet (repush handles it)", async () => {
    arrange({
      before: [
        task({ id: "a", blockEventId: null, scheduledStart: null, scheduledEnd: null }),
      ],
      after: [
        task({ id: "a", blockEventId: null, scheduledStart: start2, scheduledEnd: end2 }),
      ],
    });

    await scheduleAllTasksForUser(USER);

    expect(dirtyFlagCall()).toBeUndefined();
  });

  it("flags only the moved task when others stay put", async () => {
    arrange({
      before: [
        task({ id: "a", blockEventId: "evt-a", scheduledStart: start1, scheduledEnd: end1 }),
        task({ id: "b", blockEventId: "evt-b", scheduledStart: start2, scheduledEnd: end2 }),
      ],
      after: [
        task({ id: "a", blockEventId: "evt-a", scheduledStart: start2, scheduledEnd: end2 }),
        task({ id: "b", blockEventId: "evt-b", scheduledStart: start2, scheduledEnd: end2 }),
      ],
    });

    await scheduleAllTasksForUser(USER);

    const call = dirtyFlagCall();
    expect(call).toBeDefined();
    expect(call![0].where.id.in).toEqual(["a"]);
  });
});
