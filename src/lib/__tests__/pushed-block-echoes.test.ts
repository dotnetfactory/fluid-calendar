import { prisma } from "@/lib/prisma";
import {
  getPushedBlockEventIds,
  isOwnPushedBlock,
} from "@/lib/task-block-push";

// Pushed task blocks are events FluidCalendar creates on the user's Google
// calendar; the feed sync re-imports them as "echoes". These helpers let the
// import (and conflict detection) recognize and skip those echoes so a task
// block never renders twice. See the dedupe-pushed-block-echoes fix.

jest.mock("@/lib/google-calendar", () => ({
  createGoogleEvent: jest.fn(),
  updateGoogleEvent: jest.fn(),
  deleteGoogleEvent: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: { task: { findMany: jest.fn() } },
}));

jest.mock("@/lib/logger", () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockPrisma = prisma as unknown as {
  task: { findMany: jest.Mock };
};

beforeEach(() => jest.clearAllMocks());

describe("getPushedBlockEventIds", () => {
  it("returns the set of non-null blockEventIds for the user", async () => {
    mockPrisma.task.findMany.mockResolvedValue([
      { blockEventId: "evt-1" },
      { blockEventId: "evt-2" },
    ]);

    const result = await getPushedBlockEventIds("user-1");

    expect(result).toEqual(new Set(["evt-1", "evt-2"]));
    expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", blockEventId: { not: null } },
      select: { blockEventId: true },
    });
  });

  it("returns an empty set when the user has no pushed blocks", async () => {
    mockPrisma.task.findMany.mockResolvedValue([]);
    expect(await getPushedBlockEventIds("user-1")).toEqual(new Set());
  });

  it("filters out any null blockEventId values", async () => {
    mockPrisma.task.findMany.mockResolvedValue([
      { blockEventId: "evt-1" },
      { blockEventId: null },
    ]);
    expect(await getPushedBlockEventIds("user-1")).toEqual(new Set(["evt-1"]));
  });

  it("accepts an injected client (e.g. a transaction client)", async () => {
    const txFindMany = jest.fn().mockResolvedValue([{ blockEventId: "tx-evt" }]);
    const tx = { task: { findMany: txFindMany } } as never;

    const result = await getPushedBlockEventIds("user-1", tx);

    expect(result).toEqual(new Set(["tx-evt"]));
    expect(txFindMany).toHaveBeenCalled();
    expect(mockPrisma.task.findMany).not.toHaveBeenCalled();
  });
});

describe("isOwnPushedBlock", () => {
  const pushed = new Set(["evt-1", "evt-2"]);

  it("is true when the event id is a pushed block", () => {
    expect(isOwnPushedBlock("evt-1", pushed)).toBe(true);
  });

  it("is false when the event id is not a pushed block", () => {
    expect(isOwnPushedBlock("evt-9", pushed)).toBe(false);
  });

  it("is false for null/undefined event ids", () => {
    expect(isOwnPushedBlock(null, pushed)).toBe(false);
    expect(isOwnPushedBlock(undefined, pushed)).toBe(false);
  });

  it("is false against an empty pushed set", () => {
    expect(isOwnPushedBlock("evt-1", new Set())).toBe(false);
  });
});
