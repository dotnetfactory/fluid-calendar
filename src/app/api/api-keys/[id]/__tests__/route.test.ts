import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

// Mock dependencies
jest.mock("@/lib/auth/api-auth");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    apiKey: {
      updateMany: jest.fn(),
    },
  },
}));
jest.mock("@/lib/logger");

// Import route handler after mocking
import { DELETE } from "../route";

const mockAuthenticateRequest = authenticateRequest as unknown as jest.Mock;
const mockPrisma = prisma as unknown as Record<string, Record<string, jest.Mock>>;

describe("DELETE /api/api-keys/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("revokes a key by setting revokedAt", async () => {
    mockAuthenticateRequest.mockResolvedValue({ userId: "u1" });
    mockPrisma.apiKey.updateMany.mockResolvedValue({ count: 1 });

    const request = { headers: new Headers() } as unknown as NextRequest;
    const params = Promise.resolve({ id: "k1" });

    const res = (await DELETE(request, { params })) as NextResponse;

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.revoked).toBe(true);
    expect(body.id).toBe("k1");
  });

  it("sets revokedAt to now when revoking", async () => {
    mockAuthenticateRequest.mockResolvedValue({ userId: "u1" });
    mockPrisma.apiKey.updateMany.mockResolvedValue({ count: 1 });

    const request = { headers: new Headers() } as unknown as NextRequest;
    const params = Promise.resolve({ id: "k1" });

    await DELETE(request, { params });

    const updateCall = mockPrisma.apiKey.updateMany.mock.calls[0];
    expect(updateCall[0].data.revokedAt).toBeInstanceOf(Date);
  });

  it("scopes revoke to userId to prevent cross-user revocation", async () => {
    mockAuthenticateRequest.mockResolvedValue({ userId: "u1" });
    mockPrisma.apiKey.updateMany.mockResolvedValue({ count: 1 });

    const request = { headers: new Headers() } as unknown as NextRequest;
    const params = Promise.resolve({ id: "k1" });

    await DELETE(request, { params });

    const updateCall = mockPrisma.apiKey.updateMany.mock.calls[0];
    expect(updateCall[0].where).toEqual({
      id: "k1",
      userId: "u1",
      revokedAt: null,
    });
  });

  it("returns 404 if key not found or already revoked", async () => {
    mockAuthenticateRequest.mockResolvedValue({ userId: "u1" });
    mockPrisma.apiKey.updateMany.mockResolvedValue({ count: 0 });

    const request = { headers: new Headers() } as unknown as NextRequest;
    const params = Promise.resolve({ id: "nonexistent" });

    const res = (await DELETE(request, { params })) as NextResponse;

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("not found");
  });

  it("returns 404 if count is 0", async () => {
    mockAuthenticateRequest.mockResolvedValue({ userId: "u1" });
    mockPrisma.apiKey.updateMany.mockResolvedValue({ count: 0 });

    const request = { headers: new Headers() } as unknown as NextRequest;
    const params = Promise.resolve({ id: "k1" });

    const res = (await DELETE(request, { params })) as NextResponse;

    expect(res.status).toBe(404);
  });

  it("returns 401 if not authenticated", async () => {
    mockAuthenticateRequest.mockResolvedValue({
      response: { status: 401, json: async () => ({ error: "Unauthorized" }) },
    });

    const request = { headers: new Headers() } as unknown as NextRequest;
    const params = Promise.resolve({ id: "k1" });

    const res = (await DELETE(request, { params })) as NextResponse;

    expect(res.status).toBe(401);
  });
});
