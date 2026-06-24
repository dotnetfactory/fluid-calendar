import { NextRequest } from "next/server";

import { requireV1Auth } from "@/lib/auth/api-key";
import { runIdempotent } from "@/lib/api/idempotency";
import { _resetRateLimitBuckets } from "@/lib/api/rate-limit";
import { ApiHttpError, v1Read, v1Write } from "@/lib/api/v1";

jest.mock("@/lib/auth/api-key", () => ({ requireV1Auth: jest.fn() }));
jest.mock("@/lib/logger", () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
// Pass-through idempotency: just run produce (tested separately).
jest.mock("@/lib/api/idempotency", () => ({
  runIdempotent: jest.fn(({ produce }) => produce()),
}));

const mockAuth = requireV1Auth as unknown as jest.Mock;
const mockIdem = runIdempotent as unknown as jest.Mock;

function req(headers: Record<string, string> = {}): NextRequest {
  return { headers: new Headers(headers) } as unknown as NextRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
  _resetRateLimitBuckets();
  mockIdem.mockImplementation(({ produce }) => produce());
});

describe("v1Write", () => {
  it("returns the produced body with rate-limit headers on success", async () => {
    mockAuth.mockResolvedValue({ userId: "u1", authMethod: "api_key" });
    const res = await v1Write(req(), "POST /x", async () => ({
      status: 201,
      body: { id: "t1" },
    }));
    expect(res.status).toBe(201);
    expect(res.headers.get("X-RateLimit-Limit")).toBeTruthy();
    await expect(res.json()).resolves.toEqual({ id: "t1" });
  });

  it("maps an auth error to the envelope without running the body", async () => {
    mockAuth.mockResolvedValue({ error: "forbidden" });
    const produce = jest.fn();
    const res = await v1Write(req(), "POST /x", produce);
    expect(res.status).toBe(403);
    expect(produce).not.toHaveBeenCalled();
  });

  it("maps a thrown ApiHttpError to the right status + field", async () => {
    mockAuth.mockResolvedValue({ userId: "u1", authMethod: "api_key" });
    const res = await v1Write(req(), "POST /x", async () => {
      throw new ApiHttpError("INVALID_ARGUMENT", "title is required", {
        field: "title",
      });
    });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: { code: "INVALID_ARGUMENT", message: "title is required", field: "title" },
    });
  });

  it("returns 429 once the per-user limit is exceeded", async () => {
    mockAuth.mockResolvedValue({ userId: "u2", authMethod: "api_key" });
    let last;
    for (let i = 0; i < 3; i++) {
      last = await v1Write(req(), "POST /x", async () => ({ status: 200, body: {} }), {
        bucket: "tiny",
        limit: 2,
      });
    }
    expect(last!.status).toBe(429);
    expect(last!.headers.get("Retry-After")).toBeTruthy();
  });

  it("hands the Idempotency-Key through to runIdempotent", async () => {
    mockAuth.mockResolvedValue({ userId: "u1", authMethod: "api_key" });
    await v1Write(req({ "idempotency-key": "abc" }), "POST /x", async () => ({
      status: 201,
      body: {},
    }));
    expect(mockIdem).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", key: "abc", route: "POST /x" })
    );
  });
});

describe("v1Read", () => {
  it("returns produced body and does not use idempotency", async () => {
    mockAuth.mockResolvedValue({ userId: "u1", authMethod: "session" });
    const res = await v1Read(req(), async () => ({
      status: 200,
      body: { data: [], next_cursor: null, has_more: false },
    }));
    expect(res.status).toBe(200);
    expect(mockIdem).not.toHaveBeenCalled();
  });
});
