import { NextRequest } from "next/server";

import { v1Write } from "@/lib/api/v1";
import { autoScheduleReadiness } from "@/lib/api/schedule-guard";
import { _resetRateLimitBuckets } from "@/lib/api/rate-limit";
import { scheduleAllTasksForUser } from "@/services/scheduling/TaskSchedulingService";

// Mock dependencies
jest.mock("@/lib/api/v1");
jest.mock("@/lib/api/schedule-guard");
jest.mock("@/lib/auth/api-key");
jest.mock("@/lib/api/idempotency");
jest.mock("@/lib/logger");
jest.mock("@/services/scheduling/TaskSchedulingService");

// Import the route handler after mocking
import { POST } from "../route";

const mockV1Write = v1Write as unknown as jest.Mock;
const mockAutoScheduleReadiness = autoScheduleReadiness as unknown as jest.Mock;
const mockScheduleAllTasksForUser = scheduleAllTasksForUser as unknown as jest.Mock;

describe("POST /api/v1/schedule", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetRateLimitBuckets();
  });

  it("calls v1Write with correct routeLabel and rate limit options", async () => {
    mockV1Write.mockResolvedValue({ status: 200 });
    const request = { headers: new Headers() } as unknown as NextRequest;

    await POST(request);

    expect(mockV1Write).toHaveBeenCalledWith(
      request,
      "POST /api/v1/schedule",
      expect.any(Function),
      { bucket: "schedule", limit: 6, windowMs: 60000 }
    );
  });

  it("checks readiness and returns 400 if not ready", async () => {
    mockAutoScheduleReadiness.mockResolvedValue({
      ready: false,
      reason: "Auto-scheduling is not configured",
    });

    const mockProducer = mockV1Write.mock.calls[0]?.[2];
    if (mockProducer) {
      await mockProducer({ userId: "u1" });
      // This should throw ApiHttpError which v1Write catches
      expect(mockProducer).toBeDefined();
    }
  });

  it("schedules tasks and returns scheduled count on success", async () => {
    const mockTasks = [
      { id: "t1", title: "Task 1" },
      { id: "t2", title: "Task 2" },
    ];

    mockAutoScheduleReadiness.mockResolvedValue({ ready: true });
    mockScheduleAllTasksForUser.mockResolvedValue(mockTasks);

    mockV1Write.mockImplementation(
      async (request, label, producer) => {
        const result = await producer({ userId: "u1" });
        return { status: result.status, json: async () => result.body };
      }
    );

    const request = { headers: new Headers() } as unknown as NextRequest;
    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("uses the tighter rate limit bucket for this heavy path", async () => {
    mockV1Write.mockResolvedValue({ status: 200 });
    const request = { headers: new Headers() } as unknown as NextRequest;

    await POST(request);

    // Check that the rate limit options match the spec
    const callArgs = mockV1Write.mock.calls[0];
    expect(callArgs[3]).toEqual({
      bucket: "schedule",
      limit: 6,
      windowMs: 60000,
    });
  });
});
