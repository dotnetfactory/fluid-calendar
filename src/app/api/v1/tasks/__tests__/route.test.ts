import { NextRequest } from "next/server";

// Mock dependencies first, before any imports of route handlers
jest.mock("@/lib/api/idempotency", () => ({
  runIdempotent: jest.fn(({ produce }) => produce()),
}));
jest.mock("@/lib/auth/api-key", () => ({
  requireV1Auth: jest.fn(async () => ({
    userId: "test-user-id",
    authMethod: "api_key",
  })),
}));
jest.mock("@/lib/logger");
jest.mock("@/lib/prisma", () => ({
  prisma: { task: {} },
}));
jest.mock("@/lib/task-block-push");
jest.mock("@/lib/api/schedule-guard");
jest.mock("@/services/scheduling/TaskSchedulingService");

import { prisma } from "@/lib/prisma";
import { autoScheduleReadiness } from "@/lib/api/schedule-guard";
import { scheduleAllTasksForUser } from "@/services/scheduling/TaskSchedulingService";

const mockAutoScheduleReadiness = autoScheduleReadiness as jest.Mock;
const mockScheduleAllTasksForUser = scheduleAllTasksForUser as jest.Mock;

function createRequest(
  method = "POST",
  url?: string,
  body?: unknown
): NextRequest {
  return {
    method,
    json: async () => body,
    headers: new Headers(),
    url: url || "http://localhost/api/v1/tasks",
  } as unknown as NextRequest;
}

describe("POST /api/v1/tasks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects empty title with 400", async () => {
    const { POST } = await import("../route");
    const taskData = { title: "" };
    const req = createRequest("POST", undefined, taskData);

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error?.code).toBe("INVALID_ARGUMENT");
    expect(body.error?.field).toBe("title");
  });

  it("rejects batch size over 100", async () => {
    const { POST } = await import("../route");
    const taskData = Array.from({ length: 101 }, (_, i) => ({
      title: `Task ${i}`,
    }));
    const req = createRequest("POST", undefined, taskData);

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error?.code).toBe("INVALID_ARGUMENT");
    expect(body.error?.message).toContain("exceeds maximum");
  });

  it("rejects when autoScheduled but user not ready", async () => {
    const { POST } = await import("../route");
    mockAutoScheduleReadiness.mockResolvedValueOnce({
      ready: false,
      reason: "Timezone not set",
    });

    const taskData = {
      title: "Auto Task",
      autoScheduled: { deadline: "2025-12-31" },
    };
    const req = createRequest("POST", undefined, taskData);

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error?.message).toContain("Timezone");
  });

  it("calls scheduleAllTasksForUser exactly once when autoScheduled", async () => {
    const { POST } = await import("../route");
    const taskData = [
      { title: "Auto Task 1", autoScheduled: { deadline: "2025-12-31" } },
      { title: "Auto Task 2", autoScheduled: { deadline: "2025-12-31" } },
    ];

    mockAutoScheduleReadiness.mockResolvedValueOnce({ ready: true });
    (prisma.task.create as jest.Mock) = jest
      .fn()
      .mockResolvedValueOnce({
        id: "t1",
        title: "Auto Task 1",
        userId: "test-user-id",
      })
      .mockResolvedValueOnce({
        id: "t2",
        title: "Auto Task 2",
        userId: "test-user-id",
      });
    (prisma.task.findMany as jest.Mock) = jest
      .fn()
      .mockResolvedValueOnce([
        { id: "t1", title: "Auto Task 1" },
        { id: "t2", title: "Auto Task 2" },
      ]);
    mockScheduleAllTasksForUser.mockResolvedValueOnce([
      { id: "t1" },
      { id: "t2" },
    ]);

    const req = createRequest("POST", undefined, taskData);
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(mockScheduleAllTasksForUser).toHaveBeenCalledTimes(1);
    expect(mockScheduleAllTasksForUser).toHaveBeenCalledWith("test-user-id");
  });

  it("creates single task and returns it", async () => {
    const { POST } = await import("../route");
    const taskData = { title: "Single Task" };

    (prisma.task.create as jest.Mock) = jest
      .fn()
      .mockResolvedValueOnce({
        id: "t1",
        title: "Single Task",
        userId: "test-user-id",
      });

    const req = createRequest("POST", undefined, taskData);
    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("t1");
  });

  it("creates batch of tasks and returns array", async () => {
    const { POST } = await import("../route");
    const taskData = [{ title: "Task 1" }, { title: "Task 2" }];

    (prisma.task.create as jest.Mock) = jest
      .fn()
      .mockResolvedValueOnce({ id: "t1", title: "Task 1" })
      .mockResolvedValueOnce({ id: "t2", title: "Task 2" });

    const req = createRequest("POST", undefined, taskData);
    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);
  });

  it("rejects a non-RFC-3339 dueDate with 400", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      createRequest("POST", undefined, { title: "T", dueDate: "06/24/2026" })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error?.code).toBe("INVALID_ARGUMENT");
    expect(body.error?.field).toBe("dueDate");
  });

  it("ignores injected protected fields (no mass-assignment)", async () => {
    const { POST } = await import("../route");
    const create = jest.fn().mockResolvedValueOnce({ id: "t1" });
    (prisma.task.create as jest.Mock) = create;

    // Attacker tries to write another user's id + server-controlled columns.
    const taskData = {
      title: "Evil",
      userId: "victim-user-id",
      scheduledStart: "2030-01-01T00:00:00Z",
      blockEventId: "x",
      status: "completed",
    };
    const res = await POST(createRequest("POST", undefined, taskData));

    expect(res.status).toBe(201);
    const data = create.mock.calls[0][0].data;
    expect(data.userId).toBe("test-user-id"); // authenticated user, not injected
    expect(data.scheduledStart).toBeUndefined();
    expect(data.blockEventId).toBeUndefined();
    expect(data.status).toBe("completed"); // status IS allow-listed
  });
});

describe("GET /api/v1/tasks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns paginated response with has_more and next_cursor", async () => {
    const { GET } = await import("../route");
    const tasks = [
      { id: "t1", title: "Task 1" },
      { id: "t2", title: "Task 2" },
    ];

    (prisma.task.findMany as jest.Mock) = jest
      .fn()
      .mockResolvedValueOnce(tasks);

    const req = createRequest("GET");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.has_more).toBe(false);
    expect(body.next_cursor).toBeNull();
  });

  it("sets has_more and next_cursor when more results exist", async () => {
    const { GET } = await import("../route");
    const tasks = Array.from({ length: 51 }, (_, i) => ({
      id: `t${i}`,
      title: `Task ${i}`,
    }));

    (prisma.task.findMany as jest.Mock) = jest
      .fn()
      .mockResolvedValueOnce(tasks);

    const req = createRequest("GET", "http://localhost/api/v1/tasks?limit=50");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(50);
    expect(body.has_more).toBe(true);
    expect(body.next_cursor).toBe("t49");
  });

  it("filters by status when provided", async () => {
    const { GET } = await import("../route");
    const tasks = [{ id: "t1", status: "todo" }];

    (prisma.task.findMany as jest.Mock) = jest
      .fn()
      .mockResolvedValueOnce(tasks);

    const req = createRequest(
      "GET",
      "http://localhost/api/v1/tasks?status=todo"
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "todo" }),
      })
    );
  });

  it("respects limit and caps at 500", async () => {
    const { GET } = await import("../route");
    const tasks = Array.from({ length: 100 }, (_, i) => ({ id: `t${i}` }));

    (prisma.task.findMany as jest.Mock) = jest
      .fn()
      .mockResolvedValueOnce(tasks);

    const req = createRequest("GET", "http://localhost/api/v1/tasks?limit=600");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 501 })
    );
  });

  it("uses cursor for pagination", async () => {
    const { GET } = await import("../route");
    const tasks = [
      { id: "t2", title: "Task 2" },
      { id: "t3", title: "Task 3" },
    ];

    (prisma.task.findMany as jest.Mock) = jest
      .fn()
      .mockResolvedValueOnce(tasks);

    const req = createRequest(
      "GET",
      "http://localhost/api/v1/tasks?cursor=t1"
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: "t1" },
        skip: 1,
      })
    );
  });
});
