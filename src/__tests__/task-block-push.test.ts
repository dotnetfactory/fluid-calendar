import { GaxiosError } from "gaxios";

import {
  createGoogleEvent,
  deleteGoogleEvent,
  updateGoogleEvent,
} from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";
import {
  pushTaskBlock,
  removeAllTaskBlocks,
  repushDirtyBlocks,
} from "@/lib/task-block-push";

jest.mock("@/lib/google-calendar", () => ({
  createGoogleEvent: jest.fn(),
  updateGoogleEvent: jest.fn(),
  deleteGoogleEvent: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    task: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    autoScheduleSettings: {
      findUnique: jest.fn(),
    },
    calendarFeed: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockPrisma = prisma as unknown as {
  task: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
  };
  autoScheduleSettings: { findUnique: jest.Mock };
  calendarFeed: { findUnique: jest.Mock };
};
const mockCreate = createGoogleEvent as jest.Mock;
const mockUpdate = updateGoogleEvent as jest.Mock;
const mockDelete = deleteGoogleEvent as jest.Mock;

const USER = "user-1";

function gaxios404(): GaxiosError {
  const err = Object.create(GaxiosError.prototype) as GaxiosError;
  err.message = "Not Found";
  // @ts-expect-error partial response is sufficient for the helper
  err.response = { status: 404 };
  return err;
}

function baseTask(overrides: Record<string, unknown> = {}) {
  return {
    id: "task-1",
    userId: USER,
    title: "Write report",
    status: "todo",
    scheduledStart: new Date("2026-06-12T14:00:00Z"),
    scheduledEnd: new Date("2026-06-12T15:00:00Z"),
    blockEventId: null,
    blockFeedId: null,
    blockDirty: false,
    ...overrides,
  };
}

function settings(overrides: Record<string, unknown> = {}) {
  return {
    userId: USER,
    pushTasksToCalendar: true,
    pushTasksFeedId: "feed-1",
    ...overrides,
  };
}

function googleFeed(id = "feed-1", url = "gcal-id-1") {
  return {
    id,
    type: "GOOGLE",
    url,
    accountId: "acct-1",
    account: { id: "acct-1" },
    userId: USER,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.task.update.mockResolvedValue({});
});

describe("pushTaskBlock state transitions", () => {
  test("creates event and stores blockEventId + blockFeedId when task is scheduled and push enabled", async () => {
    mockPrisma.task.findUnique.mockResolvedValue(baseTask());
    mockPrisma.autoScheduleSettings.findUnique.mockResolvedValue(settings());
    mockPrisma.calendarFeed.findUnique.mockResolvedValue(googleFeed());
    mockCreate.mockResolvedValue({ id: "evt-1" });

    await pushTaskBlock(USER, "task-1");

    expect(mockCreate).toHaveBeenCalledWith(
      "acct-1",
      USER,
      "gcal-id-1",
      expect.objectContaining({
        title: "Write report",
      })
    );
    expect(mockPrisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          blockEventId: "evt-1",
          blockFeedId: "feed-1",
          blockDirty: false,
        }),
      })
    );
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  test("updates existing event when task moves on the same feed", async () => {
    mockPrisma.task.findUnique.mockResolvedValue(
      baseTask({ blockEventId: "evt-1", blockFeedId: "feed-1" })
    );
    mockPrisma.autoScheduleSettings.findUnique.mockResolvedValue(settings());
    mockPrisma.calendarFeed.findUnique.mockResolvedValue(googleFeed());
    mockUpdate.mockResolvedValue({});

    await pushTaskBlock(USER, "task-1");

    expect(mockUpdate).toHaveBeenCalledWith(
      "acct-1",
      USER,
      "gcal-id-1",
      "evt-1",
      expect.anything()
    );
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  test("deletes event when task is completed", async () => {
    mockPrisma.task.findUnique.mockResolvedValue(
      baseTask({
        status: "completed",
        blockEventId: "evt-1",
        blockFeedId: "feed-1",
      })
    );
    mockPrisma.autoScheduleSettings.findUnique.mockResolvedValue(settings());
    mockPrisma.calendarFeed.findUnique.mockResolvedValue(googleFeed());
    mockDelete.mockResolvedValue({});

    await pushTaskBlock(USER, "task-1");

    expect(mockDelete).toHaveBeenCalledWith(
      "acct-1",
      USER,
      "gcal-id-1",
      "evt-1",
      "single"
    );
    expect(mockPrisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          blockEventId: null,
          blockDirty: false,
        }),
      })
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test("deletes event when push is disabled but event exists", async () => {
    mockPrisma.task.findUnique.mockResolvedValue(
      baseTask({ blockEventId: "evt-1", blockFeedId: "feed-1" })
    );
    mockPrisma.autoScheduleSettings.findUnique.mockResolvedValue(
      settings({ pushTasksToCalendar: false })
    );
    mockPrisma.calendarFeed.findUnique.mockResolvedValue(googleFeed());
    mockDelete.mockResolvedValue({});

    await pushTaskBlock(USER, "task-1");

    expect(mockDelete).toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test("feed switch: deletes from old feed and creates on new feed", async () => {
    mockPrisma.task.findUnique.mockResolvedValue(
      baseTask({ blockEventId: "evt-1", blockFeedId: "feed-old" })
    );
    mockPrisma.autoScheduleSettings.findUnique.mockResolvedValue(
      settings({ pushTasksFeedId: "feed-new" })
    );
    mockPrisma.calendarFeed.findUnique.mockImplementation(
      ({ where }: { where: { id: string } }) =>
        Promise.resolve(
          where.id === "feed-new"
            ? googleFeed("feed-new", "gcal-new")
            : googleFeed("feed-old", "gcal-old")
        )
    );
    mockDelete.mockResolvedValue({});
    mockCreate.mockResolvedValue({ id: "evt-2" });

    await pushTaskBlock(USER, "task-1");

    expect(mockDelete).toHaveBeenCalledWith(
      "acct-1",
      USER,
      "gcal-old",
      "evt-1",
      "single"
    );
    expect(mockCreate).toHaveBeenCalledWith(
      "acct-1",
      USER,
      "gcal-new",
      expect.anything()
    );
    expect(mockPrisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          blockEventId: "evt-2",
          blockFeedId: "feed-new",
        }),
      })
    );
  });
});

describe("pushTaskBlock error handling", () => {
  test("create failure marks task dirty without throwing", async () => {
    mockPrisma.task.findUnique.mockResolvedValue(baseTask());
    mockPrisma.autoScheduleSettings.findUnique.mockResolvedValue(settings());
    mockPrisma.calendarFeed.findUnique.mockResolvedValue(googleFeed());
    mockCreate.mockRejectedValue(new Error("rate limited"));

    await expect(pushTaskBlock(USER, "task-1")).resolves.toBeUndefined();

    expect(mockPrisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ blockDirty: true }),
      })
    );
  });

  test("404 on update clears blockEventId and marks dirty so next push recreates", async () => {
    mockPrisma.task.findUnique.mockResolvedValue(
      baseTask({ blockEventId: "evt-gone", blockFeedId: "feed-1" })
    );
    mockPrisma.autoScheduleSettings.findUnique.mockResolvedValue(settings());
    mockPrisma.calendarFeed.findUnique.mockResolvedValue(googleFeed());
    mockUpdate.mockRejectedValue(gaxios404());

    await pushTaskBlock(USER, "task-1");

    expect(mockPrisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          blockEventId: null,
          blockDirty: true,
        }),
      })
    );
  });

  test("404 on delete is treated as success and clears block state", async () => {
    mockPrisma.task.findUnique.mockResolvedValue(
      baseTask({
        status: "completed",
        blockEventId: "evt-gone",
        blockFeedId: "feed-1",
      })
    );
    mockPrisma.autoScheduleSettings.findUnique.mockResolvedValue(settings());
    mockPrisma.calendarFeed.findUnique.mockResolvedValue(googleFeed());
    mockDelete.mockRejectedValue(gaxios404());

    await pushTaskBlock(USER, "task-1");

    expect(mockPrisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          blockEventId: null,
          blockDirty: false,
        }),
      })
    );
  });

  test("non-GOOGLE feed is rejected without calling Google APIs", async () => {
    mockPrisma.task.findUnique.mockResolvedValue(baseTask());
    mockPrisma.autoScheduleSettings.findUnique.mockResolvedValue(settings());
    mockPrisma.calendarFeed.findUnique.mockResolvedValue({
      ...googleFeed(),
      type: "OUTLOOK",
    });

    await pushTaskBlock(USER, "task-1");

    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });
});

describe("removeAllTaskBlocks", () => {
  test("deletes every pushed event and clears block state on each task", async () => {
    mockPrisma.task.findMany.mockResolvedValue([
      baseTask({ id: "t1", blockEventId: "e1", blockFeedId: "feed-1" }),
      baseTask({ id: "t2", blockEventId: "e2", blockFeedId: "feed-1" }),
    ]);
    mockPrisma.calendarFeed.findUnique.mockResolvedValue(googleFeed());
    mockDelete.mockResolvedValue({});

    await removeAllTaskBlocks(USER);

    expect(mockDelete).toHaveBeenCalledTimes(2);
    const clearCalls = mockPrisma.task.update.mock.calls.filter(
      ([arg]) => arg.data.blockEventId === null
    );
    expect(clearCalls).toHaveLength(2);
  });

  test("clears local state even when blockFeedId is missing", async () => {
    mockPrisma.task.findMany.mockResolvedValue([
      baseTask({ id: "t1", blockEventId: "e1", blockFeedId: null }),
    ]);

    await removeAllTaskBlocks(USER);

    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockPrisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "t1" },
        data: expect.objectContaining({ blockEventId: null }),
      })
    );
  });
});

describe("repushDirtyBlocks", () => {
  test("queries dirty tasks and newly scheduled tasks, skips processing when push disabled", async () => {
    mockPrisma.task.findMany.mockResolvedValue([]);
    mockPrisma.autoScheduleSettings.findUnique.mockResolvedValue(
      settings({ pushTasksToCalendar: false })
    );

    await repushDirtyBlocks(USER);

    expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: USER,
          OR: expect.arrayContaining([{ blockDirty: true }]),
        }),
      })
    );
    // push disabled → no per-task processing
    expect(mockPrisma.task.findUnique).not.toHaveBeenCalled();
  });

  test("pushes each found task when enabled", async () => {
    mockPrisma.task.findMany.mockResolvedValue([
      baseTask({ id: "t1", blockDirty: true }),
      baseTask({ id: "t2" }),
    ]);
    mockPrisma.autoScheduleSettings.findUnique.mockResolvedValue(settings());
    mockPrisma.task.findUnique.mockResolvedValue(baseTask());
    mockPrisma.calendarFeed.findUnique.mockResolvedValue(googleFeed());
    mockCreate.mockResolvedValue({ id: "evt-x" });

    await repushDirtyBlocks(USER);

    // each task flows through pushTaskBlock → task.findUnique called per task
    expect(mockPrisma.task.findUnique).toHaveBeenCalledTimes(2);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});
