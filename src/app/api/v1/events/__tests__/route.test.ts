import { NextRequest } from "next/server";
import { POST as postHandler, GET as getHandler } from "../route";
import { GET, PATCH, DELETE } from "../[id]/route";

import { requireV1Auth } from "@/lib/auth/api-key";
import { runIdempotent } from "@/lib/api/idempotency";
import { prisma } from "@/lib/prisma";
import { _resetRateLimitBuckets } from "@/lib/api/rate-limit";

jest.mock("@/lib/auth/api-key", () => ({ requireV1Auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    calendarFeed: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    calendarEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));
jest.mock("@/lib/logger", () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));
jest.mock("@/lib/api/idempotency", () => ({
  runIdempotent: jest.fn(({ produce }) => produce()),
}));

const mockAuth = requireV1Auth as unknown as jest.Mock;
const mockIdem = runIdempotent as unknown as jest.Mock;
const mockFeed = prisma.calendarFeed as unknown as {
  findFirst: jest.Mock;
  create: jest.Mock;
};
const mockEvent = prisma.calendarEvent as unknown as {
  create: jest.Mock;
  findMany: jest.Mock;
  findUnique: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

function req(
  body?: unknown,
  headers: Record<string, string> = {}
): NextRequest {
  const request = { headers: new Headers(headers) } as unknown as NextRequest;
  if (body) {
    request.json = jest.fn(async () => body);
  }
  return request;
}

beforeEach(() => {
  jest.clearAllMocks();
  _resetRateLimitBuckets();
  mockIdem.mockImplementation(({ produce }) => produce());
  mockAuth.mockResolvedValue({ userId: "u1", authMethod: "api_key" });
});

describe("POST /api/v1/events — create events", () => {
  it("auto-resolves an existing LOCAL feed and creates a single event", async () => {
    const existingFeed = { id: "feed1", name: "Local Calendar", type: "LOCAL" };
    const createdEvent = {
      id: "evt1",
      feedId: "feed1",
      title: "Meeting",
      start: new Date("2026-06-22T10:00:00Z"),
      end: new Date("2026-06-22T11:00:00Z"),
      description: null,
      location: null,
      isRecurring: false,
      recurrenceRule: null,
      allDay: false,
    };

    mockFeed.findFirst.mockResolvedValue(existingFeed);
    mockEvent.create.mockResolvedValue(createdEvent);

    const res = await postHandler(
      req(
        {
          title: "Meeting",
          start: "2026-06-22T10:00:00Z",
          end: "2026-06-22T11:00:00Z",
        }
      )
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("evt1");
    expect(body.title).toBe("Meeting");

    // Verify feed lookup was scoped to userId
    expect(mockFeed.findFirst).toHaveBeenCalledWith({
      where: { userId: "u1", type: "LOCAL" },
    });
    // Verify event was created on the feed
    expect(mockEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          feedId: "feed1",
          title: "Meeting",
        }),
      })
    );
  });

  it("creates a LOCAL feed when none exists for the user", async () => {
    const newFeed = {
      id: "feed2",
      name: "Local Calendar",
      type: "LOCAL",
      userId: "u1",
      enabled: true,
    };
    const createdEvent = {
      id: "evt2",
      feedId: "feed2",
      title: "Standup",
      start: new Date("2026-06-22T09:00:00Z"),
      end: new Date("2026-06-22T09:15:00Z"),
      description: null,
      location: null,
      isRecurring: false,
      recurrenceRule: null,
      allDay: false,
    };

    mockFeed.findFirst.mockResolvedValue(null);
    mockFeed.create.mockResolvedValue(newFeed);
    mockEvent.create.mockResolvedValue(createdEvent);

    const res = await postHandler(
      req({
        title: "Standup",
        start: "2026-06-22T09:00:00Z",
        end: "2026-06-22T09:15:00Z",
      })
    );

    expect(res.status).toBe(201);

    // Verify feed creation with correct structure
    expect(mockFeed.create).toHaveBeenCalledWith({
      data: {
        name: "Local Calendar",
        type: "LOCAL",
        userId: "u1",
        enabled: true,
      },
    });
  });

  it("creates multiple events in a batch", async () => {
    const existingFeed = { id: "feed1", type: "LOCAL" };
    const events = [
      {
        id: "evt1",
        feedId: "feed1",
        title: "Event 1",
        start: new Date("2026-06-22T10:00:00Z"),
        end: new Date("2026-06-22T11:00:00Z"),
        description: null,
        location: null,
        isRecurring: false,
        recurrenceRule: null,
        allDay: false,
      },
      {
        id: "evt2",
        feedId: "feed1",
        title: "Event 2",
        start: new Date("2026-06-22T14:00:00Z"),
        end: new Date("2026-06-22T15:00:00Z"),
        description: null,
        location: null,
        isRecurring: false,
        recurrenceRule: null,
        allDay: false,
      },
    ];

    mockFeed.findFirst.mockResolvedValue(existingFeed);
    mockEvent.create
      .mockResolvedValueOnce(events[0])
      .mockResolvedValueOnce(events[1]);

    const res = await postHandler(
      req([
        {
          title: "Event 1",
          start: "2026-06-22T10:00:00Z",
          end: "2026-06-22T11:00:00Z",
        },
        {
          title: "Event 2",
          start: "2026-06-22T14:00:00Z",
          end: "2026-06-22T15:00:00Z",
        },
      ])
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(2);
    expect(mockEvent.create).toHaveBeenCalledTimes(2);
  });

  it("rejects when end <= start", async () => {
    mockFeed.findFirst.mockResolvedValue({ id: "feed1" });

    const res = await postHandler(
      req({
        title: "Bad Event",
        start: "2026-06-22T11:00:00Z",
        end: "2026-06-22T10:00:00Z",
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_ARGUMENT");
    expect(body.error.field).toBe("end");
    expect(mockEvent.create).not.toHaveBeenCalled();
  });

  it("rejects when title is missing", async () => {
    mockFeed.findFirst.mockResolvedValue({ id: "feed1" });

    const res = await postHandler(
      req({
        start: "2026-06-22T10:00:00Z",
        end: "2026-06-22T11:00:00Z",
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_ARGUMENT");
    expect(body.error.field).toBe("title");
  });

  it("rejects batch size > 100", async () => {
    const events = Array.from({ length: 101 }, (_, i) => ({
      title: `Event ${i}`,
      start: "2026-06-22T10:00:00Z",
      end: "2026-06-22T11:00:00Z",
    }));

    const res = await postHandler(req(events));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_ARGUMENT");
    expect(mockEvent.create).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/events — list events", () => {
  it("returns paginated events for the user filtered by date range", async () => {
    const events = [
      {
        id: "evt1",
        feedId: "feed1",
        title: "Event 1",
        start: new Date("2026-06-22T10:00:00Z"),
        end: new Date("2026-06-22T11:00:00Z"),
      },
      {
        id: "evt2",
        feedId: "feed1",
        title: "Event 2",
        start: new Date("2026-06-23T10:00:00Z"),
        end: new Date("2026-06-23T11:00:00Z"),
      },
    ];

    mockEvent.findMany.mockResolvedValue(events);

    const request = {
      url: "http://localhost/api/v1/events?from=2026-06-22&to=2026-06-23&limit=50",
      headers: new Headers(),
    } as unknown as NextRequest;

    const res = await getHandler(request);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.has_more).toBe(false);
    expect(body.next_cursor).toBeNull();

    // Verify query scoped to userId + date range
    expect(mockEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          feed: { userId: "u1" },
          start: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        },
      })
    );
  });

  it("respects cursor pagination", async () => {
    const events = [
      {
        id: "evt2",
        start: new Date("2026-06-23T10:00:00Z"),
      },
      {
        id: "evt3",
        start: new Date("2026-06-24T10:00:00Z"),
      },
    ];

    mockEvent.findMany.mockResolvedValue(events);

    const cursorStartIso = "2026-06-22T10:00:00.000Z";
    const cursor = `${cursorStartIso}|evt1`;
    const request = {
      url: `http://localhost/api/v1/events?cursor=${encodeURIComponent(cursor)}&limit=2`,
      headers: new Headers(),
    } as unknown as NextRequest;

    const res = await getHandler(request);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);

    // Verify cursor was decoded and used in WHERE clause
    expect(mockEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          feed: { userId: "u1" },
          OR: expect.any(Array),
        }),
      })
    );
  });

  it("filters events by userId via feed relation", async () => {
    mockEvent.findMany.mockResolvedValue([]);

    const request = {
      url: "http://localhost/api/v1/events",
      headers: new Headers(),
    } as unknown as NextRequest;

    await getHandler(request);

    expect(mockEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          feed: { userId: "u1" },
        },
      })
    );
  });

  it("rejects invalid date formats", async () => {
    const request = {
      url: "http://localhost/api/v1/events?from=not-a-date",
      headers: new Headers(),
    } as unknown as NextRequest;

    const res = await getHandler(request);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_ARGUMENT");
    expect(body.error.field).toBe("from");
  });
});

describe("GET /api/v1/events/[id]", () => {
  it("returns an event owned by the user", async () => {
    const event = {
      id: "evt1",
      feedId: "feed1",
      title: "My Event",
      feed: { userId: "u1" },
    };

    mockEvent.findUnique.mockResolvedValue(event);

    const res = await GET(
      req(),
      { params: Promise.resolve({ id: "evt1" }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("evt1");
  });

  it("returns 404 for an event owned by another user", async () => {
    const event = {
      id: "evt1",
      feedId: "feed1",
      title: "Someone Else's Event",
      feed: { userId: "u2" }, // Different owner
    };

    mockEvent.findUnique.mockResolvedValue(event);

    const res = await GET(
      req(),
      { params: Promise.resolve({ id: "evt1" }) }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 for a non-existent event", async () => {
    mockEvent.findUnique.mockResolvedValue(null);

    const res = await GET(
      req(),
      { params: Promise.resolve({ id: "evt-notfound" }) }
    );

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/v1/events/[id]", () => {
  it("updates an event owned by the user", async () => {
    const existingEvent = {
      id: "evt1",
      feedId: "feed1",
      title: "Old Title",
      start: new Date("2026-06-22T10:00:00Z"),
      end: new Date("2026-06-22T11:00:00Z"),
      feed: { userId: "u1" },
    };

    const updatedEvent = {
      ...existingEvent,
      title: "New Title",
    };

    mockEvent.findUnique.mockResolvedValue(existingEvent);
    mockEvent.update.mockResolvedValue(updatedEvent);

    const res = await PATCH(
      req({ title: "New Title" }),
      { params: Promise.resolve({ id: "evt1" }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("New Title");

    expect(mockEvent.update).toHaveBeenCalledWith({
      where: { id: "evt1" },
      data: { title: "New Title" },
      include: { feed: true },
    });
  });

  it("returns 404 for an event not owned by the user", async () => {
    const event = {
      id: "evt1",
      feed: { userId: "u2" },
    };

    mockEvent.findUnique.mockResolvedValue(event);

    const res = await PATCH(
      req({ title: "Attempted Update" }),
      { params: Promise.resolve({ id: "evt1" }) }
    );

    expect(res.status).toBe(404);
    expect(mockEvent.update).not.toHaveBeenCalled();
  });

  it("validates end > start on update", async () => {
    const existingEvent = {
      id: "evt1",
      feedId: "feed1",
      title: "Event",
      start: new Date("2026-06-22T10:00:00Z"),
      end: new Date("2026-06-22T11:00:00Z"),
      feed: { userId: "u1" },
    };

    mockEvent.findUnique.mockResolvedValue(existingEvent);

    const res = await PATCH(
      req({ end: "2026-06-22T09:00:00Z" }),
      { params: Promise.resolve({ id: "evt1" }) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.field).toBe("end");
    expect(mockEvent.update).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/v1/events/[id]", () => {
  it("deletes an event owned by the user", async () => {
    const event = {
      id: "evt1",
      feedId: "feed1",
      feed: { userId: "u1" },
    };

    mockEvent.findUnique.mockResolvedValue(event);
    mockEvent.delete.mockResolvedValue(event);

    const res = await DELETE(
      req(),
      { params: Promise.resolve({ id: "evt1" }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(true);
    expect(body.id).toBe("evt1");

    expect(mockEvent.delete).toHaveBeenCalledWith({
      where: { id: "evt1" },
    });
  });

  it("returns 404 for an event not owned by the user", async () => {
    const event = {
      id: "evt1",
      feed: { userId: "u2" },
    };

    mockEvent.findUnique.mockResolvedValue(event);

    const res = await DELETE(
      req(),
      { params: Promise.resolve({ id: "evt1" }) }
    );

    expect(res.status).toBe(404);
    expect(mockEvent.delete).not.toHaveBeenCalled();
  });

  it("returns 404 for a non-existent event", async () => {
    mockEvent.findUnique.mockResolvedValue(null);

    const res = await DELETE(
      req(),
      { params: Promise.resolve({ id: "evt-notfound" }) }
    );

    expect(res.status).toBe(404);
  });
});
