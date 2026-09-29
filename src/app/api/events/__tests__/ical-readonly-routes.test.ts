/**
 * Proves the read-only boundary for subscribed iCal (ICAL) feeds holds across
 * the mutation routes that were reachable once ICAL feeds became creatable
 * (#4):
 *
 * - `POST /api/feeds/[id]/sync` is the generic client-sync endpoint. It deletes
 *   every event for a feed and recreates them from caller-supplied JSON, so it
 *   must refuse an ICAL feed (which is server-synced and read-only) WITHOUT
 *   deleting the mirrored events.
 * - `PATCH /api/events/[id]` must not let a caller move a writable event into a
 *   read-only ICAL feed (or any other feed) by smuggling `feedId` in the body;
 *   only an allow-listed set of presentation fields may be updated.
 */
import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/auth/api-auth", () => ({ authenticateRequest: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    calendarFeed: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    calendarEvent: {
      findUnique: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockAuth = authenticateRequest as jest.MockedFunction<
  typeof authenticateRequest
>;

const USER_ID = "user-1";

/** Narrows a route handler's `Response | undefined` return to a defined Response. */
function assertResponse<T>(res: T | undefined): T {
  if (res == null) throw new Error("expected a route response, got undefined");
  return res;
}

function jsonRequest(body: unknown, url = "http://localhost/api") {
  return {
    json: async () => body,
    url,
  } as unknown as Request;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: USER_ID } as never);
});

describe("POST /api/feeds/[id]/sync read-only ICAL guard", () => {
  it("refuses to client-sync an ICAL feed without deleting its events", async () => {
    const { POST } = await import("@/app/api/feeds/[id]/sync/route");

    (prisma.calendarFeed.findUnique as jest.Mock).mockResolvedValue({
      id: "feed-ical",
      userId: USER_ID,
      type: "ICAL",
      url: "https://example.com/cal.ics",
    });

    const res = assertResponse(
      await POST(
        jsonRequest({ events: [{ start: "x", end: "y" }] }) as never,
        { params: Promise.resolve({ id: "feed-ical" }) }
      )
    );

    expect(res.status).toBe(403);
    // The destructive part of the handler must never run for a read-only feed.
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.calendarEvent.deleteMany).not.toHaveBeenCalled();
    expect(prisma.calendarEvent.createMany).not.toHaveBeenCalled();
  });

  it("still allows client-syncing a writable feed", async () => {
    const { POST } = await import("@/app/api/feeds/[id]/sync/route");

    (prisma.calendarFeed.findUnique as jest.Mock).mockResolvedValue({
      id: "feed-google",
      userId: USER_ID,
      type: "GOOGLE",
      url: null,
    });
    (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

    const res = assertResponse(
      await POST(jsonRequest({ events: [] }) as never, {
        params: Promise.resolve({ id: "feed-google" }),
      })
    );

    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});

describe("PATCH /api/events/[id] feedId retarget guard", () => {
  it("ignores a smuggled feedId so an event cannot be moved into another feed", async () => {
    const { PATCH } = await import("@/app/api/events/[id]/route");

    (prisma.calendarEvent.findUnique as jest.Mock).mockResolvedValue({
      id: "event-1",
      feedId: "feed-writable",
      feed: { userId: USER_ID, type: "GOOGLE" },
    });
    (prisma.calendarEvent.update as jest.Mock).mockImplementation(
      async ({ data }) => ({ id: "event-1", ...data })
    );

    const res = assertResponse(
      await PATCH(
        jsonRequest({
          title: "Renamed",
          feedId: "feed-ical",
          userId: "someone-else",
        }) as never,
        { params: Promise.resolve({ id: "event-1" }) }
      )
    );

    expect(res.status).toBe(200);
    expect(prisma.calendarEvent.update).toHaveBeenCalledTimes(1);
    const updateArg = (prisma.calendarEvent.update as jest.Mock).mock
      .calls[0][0];
    // The destructive fields must be stripped before hitting the DB.
    expect(updateArg.data).not.toHaveProperty("feedId");
    expect(updateArg.data).not.toHaveProperty("userId");
    expect(updateArg.data).not.toHaveProperty("id");
    // Allow-listed fields still apply.
    expect(updateArg.data.title).toBe("Renamed");
  });
});
