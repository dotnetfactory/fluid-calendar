import * as apiAuth from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

import * as caldavUtils from "@/app/api/calendar/caldav/utils";

import { POST } from "@/app/api/calendar/caldav/route";

jest.mock("@/lib/auth/api-auth");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    connectedAccount: { findUnique: jest.fn() },
    calendarFeed: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}));
jest.mock("@/app/api/calendar/caldav/utils", () => ({
  createCalDAVClient: jest.fn(() => ({})),
  fetchCalDAVCalendars: jest.fn(),
  loginToCalDAVServer: jest.fn(),
}));
// Avoid the real sync service running during the test.
jest.mock("@/lib/caldav-calendar", () => ({
  CalDAVCalendarService: jest.fn().mockImplementation(() => ({
    syncCalendar: jest.fn().mockResolvedValue(undefined),
  })),
}));
jest.mock("@/lib/logger", () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockPrisma = prisma as unknown as {
  connectedAccount: { findUnique: jest.Mock };
  calendarFeed: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
};

function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as Parameters<typeof POST>[0];
}

const SHARED_CAL_URL = "https://server-b.example.com/dav/cal-1/";

describe("CalDAV add-calendar route - account scoping (#145)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiAuth.authenticateRequest as jest.Mock).mockResolvedValue({
      userId: "user-1",
    });
    (caldavUtils.loginToCalDAVServer as jest.Mock).mockResolvedValue(true);
    // The selected (second) account's server exposes this calendar URL.
    (caldavUtils.fetchCalDAVCalendars as jest.Mock).mockResolvedValue([
      { url: SHARED_CAL_URL, displayName: "Cal", calendarColor: "#fff" },
    ]);
    mockPrisma.connectedAccount.findUnique.mockResolvedValue({
      id: "acct-2",
      provider: "CALDAV",
      caldavUrl: "https://server-b.example.com/",
      caldavUsername: "FOO",
      accessToken: "pw",
    });
  });

  it("queries existing feeds scoped to the selected account, not just the user", async () => {
    // No feed exists for THIS account (even though one may exist for another).
    mockPrisma.calendarFeed.findFirst.mockResolvedValue(null);
    mockPrisma.calendarFeed.create.mockResolvedValue({
      id: "feed-2",
      name: "Cal",
      color: "#fff",
      url: SHARED_CAL_URL,
    });
    mockPrisma.calendarFeed.update.mockResolvedValue({});

    const res = await POST(
      makeRequest({ accountId: "acct-2", calendarId: SHARED_CAL_URL })
    );

    if (!res) throw new Error("expected a response");
    // The existing-feed lookup MUST include accountId so a same-URL feed on a
    // different account is not mistaken for this account's feed.
    expect(mockPrisma.calendarFeed.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          url: SHARED_CAL_URL,
          accountId: "acct-2",
          userId: "user-1",
        }),
      })
    );
    // Since no feed exists for this account, a new one is created under it.
    expect(mockPrisma.calendarFeed.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accountId: "acct-2", url: SHARED_CAL_URL }),
      })
    );
    expect(res.status).toBe(200);
  });
});
