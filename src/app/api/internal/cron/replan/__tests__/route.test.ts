import { NextRequest } from "next/server";

import { verifyCronSecret } from "@/lib/auth/cron-auth";
import { prisma } from "@/lib/prisma";
import { repushDirtyBlocks } from "@/lib/task-block-push";
import { scheduleAllTasksForUser } from "@/services/scheduling/TaskSchedulingService";

jest.mock("@/lib/auth/cron-auth");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    systemSettings: { findFirst: jest.fn(), update: jest.fn() },
    autoScheduleSettings: { findMany: jest.fn() },
    userSettings: { findUnique: jest.fn() },
  },
}));
jest.mock("@/lib/logger");
jest.mock("@/services/scheduling/TaskSchedulingService");
jest.mock("@/lib/task-block-push");

import { POST } from "../route";

const mockVerify = verifyCronSecret as unknown as jest.Mock;
const mockSysFind = prisma.systemSettings.findFirst as unknown as jest.Mock;
const mockSysUpdate = prisma.systemSettings.update as unknown as jest.Mock;
const mockFindMany = prisma.autoScheduleSettings.findMany as unknown as jest.Mock;
const mockUserSettings = prisma.userSettings.findUnique as unknown as jest.Mock;
const mockSchedule = scheduleAllTasksForUser as unknown as jest.Mock;
const mockRepush = repushDirtyBlocks as unknown as jest.Mock;

const req = () => ({ headers: new Headers() }) as unknown as NextRequest;

describe("POST /api/internal/cron/replan", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Enabled, never run before -> due.
    mockSysFind.mockResolvedValue({
      id: "default",
      autoReplanEnabled: true,
      autoReplanIntervalMinutes: 15,
      autoReplanLastRunAt: null,
    });
    mockSysUpdate.mockResolvedValue({});
    mockUserSettings.mockResolvedValue({ timeZone: "America/Chicago" });
    mockSchedule.mockResolvedValue([]);
    mockRepush.mockResolvedValue(undefined);
  });

  it("returns 404 when the endpoint is disabled (no CRON_SECRET)", async () => {
    mockVerify.mockReturnValue("disabled");
    const res = await POST(req());
    expect(res.status).toBe(404);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns 401 when the secret is wrong/missing", async () => {
    mockVerify.mockReturnValue("unauthorized");
    const res = await POST(req());
    expect(res.status).toBe(401);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("skips when auto-replan is disabled in settings", async () => {
    mockVerify.mockReturnValue("ok");
    mockSysFind.mockResolvedValue({
      id: "default",
      autoReplanEnabled: false,
      autoReplanIntervalMinutes: 15,
      autoReplanLastRunAt: null,
    });

    const body = await (await POST(req())).json();

    expect(body.skipped).toBe("disabled");
    expect(mockFindMany).not.toHaveBeenCalled();
    expect(mockSysUpdate).not.toHaveBeenCalled();
  });

  it("throttles a heartbeat that fires before the interval elapses", async () => {
    mockVerify.mockReturnValue("ok");
    mockSysFind.mockResolvedValue({
      id: "default",
      autoReplanEnabled: true,
      autoReplanIntervalMinutes: 15,
      autoReplanLastRunAt: new Date(), // just ran -> not due
    });

    const body = await (await POST(req())).json();

    expect(body.skipped).toBe("not_due");
    expect(body.dueInSec).toBeGreaterThan(0);
    expect(mockFindMany).not.toHaveBeenCalled();
    expect(mockSysUpdate).not.toHaveBeenCalled();
  });

  it("claims the run by stamping lastRunAt before doing the work", async () => {
    mockVerify.mockReturnValue("ok");
    mockFindMany.mockResolvedValue([{ userId: "u1" }]);

    await POST(req());

    expect(mockSysUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "default" },
        data: expect.objectContaining({ autoReplanLastRunAt: expect.any(Date) }),
      })
    );
  });

  it("re-plans and re-syncs every ready user", async () => {
    mockVerify.mockReturnValue("ok");
    mockFindMany.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);

    const res = await POST(req());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.replanned).toBe(2);
    expect(body.skipped).toEqual([]);
    expect(mockSchedule).toHaveBeenCalledWith("u1");
    expect(mockSchedule).toHaveBeenCalledWith("u2");
    // Each re-plan must be followed by a block re-sync so the calendar follows.
    expect(mockRepush).toHaveBeenCalledWith("u1");
    expect(mockRepush).toHaveBeenCalledWith("u2");
  });

  it("skips a user with no timezone without scheduling, and keeps going", async () => {
    mockVerify.mockReturnValue("ok");
    mockFindMany.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);
    mockUserSettings.mockImplementation(({ where }: { where: { userId: string } }) =>
      where.userId === "u1"
        ? Promise.resolve({ timeZone: null })
        : Promise.resolve({ timeZone: "America/Chicago" })
    );

    const res = await POST(req());
    const body = await res.json();

    expect(body.replanned).toBe(1);
    expect(body.skipped).toEqual([{ userId: "u1", reason: "no_timezone" }]);
    expect(mockSchedule).not.toHaveBeenCalledWith("u1");
    expect(mockSchedule).toHaveBeenCalledWith("u2");
  });

  it("isolates a failing user so the batch still completes", async () => {
    mockVerify.mockReturnValue("ok");
    mockFindMany.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);
    mockSchedule.mockImplementation((userId: string) =>
      userId === "u1"
        ? Promise.reject(new Error("boom"))
        : Promise.resolve([])
    );

    const res = await POST(req());
    const body = await res.json();

    expect(body.replanned).toBe(1);
    expect(body.skipped).toEqual([{ userId: "u1", reason: "replan_failed" }]);
    expect(mockRepush).toHaveBeenCalledWith("u2");
    expect(mockRepush).not.toHaveBeenCalledWith("u1");
  });
});
