import { Prisma } from "@prisma/client";

import * as apiAuth from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

import * as caldavUtils from "@/app/api/calendar/caldav/utils";

import { POST } from "@/app/api/calendar/caldav/auth/route";

jest.mock("@/lib/auth/api-auth");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    connectedAccount: {
      create: jest.fn(),
    },
  },
}));
jest.mock("@/app/api/calendar/caldav/utils", () => ({
  createCalDAVClient: jest.fn(),
  fetchCalDAVCalendars: jest.fn(),
  formatAbsoluteUrl: jest.fn((serverUrl: string) => serverUrl),
  handleFastmailPath: jest.fn(() => undefined),
  loginToCalDAVServer: jest.fn(),
  normalizeCalDAVServerUrl: jest.fn((url: string) => url),
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
  connectedAccount: { create: jest.Mock };
};

function makeRequest(body: Record<string, unknown>) {
  return {
    json: async () => body,
  } as unknown as Parameters<typeof POST>[0];
}

describe("CalDAV auth route - duplicate server handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiAuth.authenticateRequest as jest.Mock).mockResolvedValue({
      userId: "user-1",
    });
    (caldavUtils.loginToCalDAVServer as jest.Mock).mockResolvedValue(true);
  });

  it("returns 409 with a clear message when the same server is already connected (P2002)", async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed on the fields: (userId,provider,email,caldavUrl)",
      { code: "P2002", clientVersion: "6.3.1" }
    );
    mockPrisma.connectedAccount.create.mockRejectedValue(p2002);

    const res = await POST(
      makeRequest({
        serverUrl: "https://server-a.example.com",
        username: "FOO",
        password: "secret",
      })
    );

    if (!res) throw new Error("expected a response");
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(JSON.stringify(json).toLowerCase()).toContain("already connected");
    expect(JSON.stringify(json).toLowerCase()).not.toContain(
      "check your credentials"
    );
  });

  it("creates the account successfully when there is no duplicate", async () => {
    mockPrisma.connectedAccount.create.mockResolvedValue({ id: "acc-1" });

    const res = await POST(
      makeRequest({
        serverUrl: "https://server-b.example.com",
        username: "FOO",
        password: "secret",
      })
    );

    if (!res) throw new Error("expected a response");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ success: true, accountId: "acc-1" });
  });
});
