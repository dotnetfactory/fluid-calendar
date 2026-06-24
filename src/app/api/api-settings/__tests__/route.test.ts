import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

// Mock dependencies
jest.mock("@/lib/auth/api-auth");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    apiSettings: {
      upsert: jest.fn(),
    },
  },
}));
jest.mock("@/lib/logger");

// Import route handlers after mocking
import { GET, PATCH } from "../route";

const mockAuthenticateRequest = authenticateRequest as unknown as jest.Mock;
const mockPrisma = prisma as unknown as Record<string, Record<string, jest.Mock>>;

describe("GET /api/api-settings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns enabled flag", async () => {
    mockAuthenticateRequest.mockResolvedValue({ userId: "u1" });
    mockPrisma.apiSettings.upsert.mockResolvedValue({ enabled: true });

    const request = { headers: new Headers() } as unknown as NextRequest;
    const res = (await GET(request)) as NextResponse;

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(true);
  });

  it("upserts default false when no row exists", async () => {
    mockAuthenticateRequest.mockResolvedValue({ userId: "u1" });
    mockPrisma.apiSettings.upsert.mockResolvedValue({ enabled: false });

    const request = { headers: new Headers() } as unknown as NextRequest;
    await GET(request);

    const upsertCall = mockPrisma.apiSettings.upsert.mock.calls[0];
    expect(upsertCall[0].where).toEqual({ userId: "u1" });
    expect(upsertCall[0].create).toEqual({ userId: "u1", enabled: false });
  });

  it("returns 401 if not authenticated", async () => {
    mockAuthenticateRequest.mockResolvedValue({
      response: { status: 401, json: async () => ({ error: "Unauthorized" }) },
    });

    const request = { headers: new Headers() } as unknown as NextRequest;
    const res = (await GET(request)) as NextResponse;

    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/api-settings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates enabled flag", async () => {
    mockAuthenticateRequest.mockResolvedValue({ userId: "u1" });
    mockPrisma.apiSettings.upsert.mockResolvedValue({ enabled: true });

    const request = {
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ enabled: true }),
    } as unknown as NextRequest;

    const res = (await PATCH(request)) as NextResponse;

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(true);
  });

  it("upserts with update and create", async () => {
    mockAuthenticateRequest.mockResolvedValue({ userId: "u1" });
    mockPrisma.apiSettings.upsert.mockResolvedValue({ enabled: true });

    const request = {
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ enabled: true }),
    } as unknown as NextRequest;

    await PATCH(request);

    const upsertCall = mockPrisma.apiSettings.upsert.mock.calls[0];
    expect(upsertCall[0].where).toEqual({ userId: "u1" });
    expect(upsertCall[0].update).toEqual({ enabled: true });
    expect(upsertCall[0].create).toEqual({ userId: "u1", enabled: true });
  });

  it("rejects non-boolean enabled value", async () => {
    mockAuthenticateRequest.mockResolvedValue({ userId: "u1" });

    const request = {
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ enabled: "yes" }),
    } as unknown as NextRequest;

    const res = (await PATCH(request)) as NextResponse;

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("boolean");
  });

  it("returns 401 if not authenticated", async () => {
    mockAuthenticateRequest.mockResolvedValue({
      response: { status: 401, json: async () => ({ error: "Unauthorized" }) },
    });

    const request = {
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ enabled: true }),
    } as unknown as NextRequest;

    const res = (await PATCH(request)) as NextResponse;

    expect(res.status).toBe(401);
  });

  it("disables API access when enabled is set to false", async () => {
    mockAuthenticateRequest.mockResolvedValue({ userId: "u1" });
    mockPrisma.apiSettings.upsert.mockResolvedValue({ enabled: false });

    const request = {
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ enabled: false }),
    } as unknown as NextRequest;

    const res = (await PATCH(request)) as NextResponse;

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(false);

    const upsertCall = mockPrisma.apiSettings.upsert.mock.calls[0];
    expect(upsertCall[0].update).toEqual({ enabled: false });
  });
});
