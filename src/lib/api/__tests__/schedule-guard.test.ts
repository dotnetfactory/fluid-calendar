import { autoScheduleReadiness } from "@/lib/api/schedule-guard";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    autoScheduleSettings: { findUnique: jest.fn() },
    userSettings: { findUnique: jest.fn() },
  },
}));

const mockAuto = prisma.autoScheduleSettings as unknown as {
  findUnique: jest.Mock;
};
const mockUser = prisma.userSettings as unknown as { findUnique: jest.Mock };

beforeEach(() => jest.clearAllMocks());

describe("autoScheduleReadiness", () => {
  it("is ready when settings exist and a (non-UTC) timezone is set", async () => {
    mockAuto.findUnique.mockResolvedValue({ id: "s1" });
    mockUser.findUnique.mockResolvedValue({ timeZone: "America/Chicago" });
    await expect(autoScheduleReadiness("u1")).resolves.toEqual({ ready: true });
  });

  it("is not ready when auto-schedule settings are missing", async () => {
    mockAuto.findUnique.mockResolvedValue(null);
    mockUser.findUnique.mockResolvedValue({ timeZone: "America/Chicago" });
    const result = await autoScheduleReadiness("u1");
    expect(result.ready).toBe(false);
  });

  it("is not ready when the timezone is missing (prevents wrong-tz scheduling)", async () => {
    mockAuto.findUnique.mockResolvedValue({ id: "s1" });
    mockUser.findUnique.mockResolvedValue({ timeZone: null });
    const result = await autoScheduleReadiness("u1");
    expect(result.ready).toBe(false);
    if (!result.ready) expect(result.reason).toMatch(/timezone/i);
  });
});
