import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { TokenManager } from "@/lib/token-manager";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    connectedAccount: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({ getOutlookCredentials: jest.fn() }));
jest.mock("@/lib/google", () => ({ createGoogleOAuthClient: jest.fn() }));

const mockPrisma = prisma as unknown as {
  connectedAccount: {
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    upsert: jest.Mock;
  };
};

describe("TokenManager.storeTokens (OAuth)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const tokens = {
    accessToken: "access-1",
    refreshToken: "refresh-1",
    expiresAt: new Date("2030-01-01T00:00:00.000Z"),
  };

  it("updates the existing account in place when one matches (userId, provider, email)", async () => {
    mockPrisma.connectedAccount.findFirst.mockResolvedValue({ id: "acc-1" });
    mockPrisma.connectedAccount.update.mockResolvedValue({ id: "acc-1" });

    const id = await TokenManager.getInstance().storeTokens(
      "GOOGLE",
      "user@gmail.com",
      tokens,
      "user-1"
    );

    expect(mockPrisma.connectedAccount.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", provider: "GOOGLE", email: "user@gmail.com" },
    });
    expect(mockPrisma.connectedAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "acc-1" },
        data: expect.objectContaining({
          accessToken: "access-1",
          refreshToken: "refresh-1",
          expiresAt: tokens.expiresAt,
        }),
      })
    );
    expect(mockPrisma.connectedAccount.create).not.toHaveBeenCalled();
    expect(id).toBe("acc-1");
  });

  it("creates a new account when none matches", async () => {
    mockPrisma.connectedAccount.findFirst.mockResolvedValue(null);
    mockPrisma.connectedAccount.create.mockResolvedValue({ id: "acc-new" });

    const id = await TokenManager.getInstance().storeTokens(
      "OUTLOOK",
      "user@outlook.com",
      tokens,
      "user-2"
    );

    expect(mockPrisma.connectedAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider: "OUTLOOK",
          email: "user@outlook.com",
          userId: "user-2",
          accessToken: "access-1",
        }),
      })
    );
    expect(mockPrisma.connectedAccount.update).not.toHaveBeenCalled();
    expect(id).toBe("acc-new");
  });

  it("does not use the removed userId_provider_email composite upsert input", async () => {
    mockPrisma.connectedAccount.findFirst.mockResolvedValue(null);
    mockPrisma.connectedAccount.create.mockResolvedValue({ id: "acc-x" });

    await TokenManager.getInstance().storeTokens(
      "GOOGLE",
      "x@gmail.com",
      tokens,
      "user-3"
    );

    expect(mockPrisma.connectedAccount.upsert).not.toHaveBeenCalled();
  });

  it("is idempotent when create races a concurrent callback (P2002 -> update existing)", async () => {
    // First lookup misses (no row yet), create loses the race (unique
    // violation), then the re-read finds the row the winner inserted.
    mockPrisma.connectedAccount.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "acc-raced" });
    mockPrisma.connectedAccount.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "6.3.1",
      })
    );
    mockPrisma.connectedAccount.update.mockResolvedValue({ id: "acc-raced" });

    const id = await TokenManager.getInstance().storeTokens(
      "GOOGLE",
      "race@gmail.com",
      tokens,
      "user-4"
    );

    expect(mockPrisma.connectedAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "acc-raced" } })
    );
    expect(id).toBe("acc-raced");
  });

  it("rethrows non-P2002 create errors", async () => {
    mockPrisma.connectedAccount.findFirst.mockResolvedValue(null);
    mockPrisma.connectedAccount.create.mockRejectedValue(
      new Error("db is down")
    );

    await expect(
      TokenManager.getInstance().storeTokens(
        "GOOGLE",
        "boom@gmail.com",
        tokens,
        "user-5"
      )
    ).rejects.toThrow("db is down");
  });
});
