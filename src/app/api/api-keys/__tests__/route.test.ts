import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { generateApiKey } from "@/lib/auth/api-key";
import { prisma } from "@/lib/prisma";

// Mock dependencies
jest.mock("@/lib/auth/api-auth");
jest.mock("@/lib/auth/api-key");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    apiKey: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));
jest.mock("@/lib/logger");

// Import route handlers after mocking
import { GET, POST } from "../route";

const mockAuthenticateRequest = authenticateRequest as unknown as jest.Mock;
const mockGenerateApiKey = generateApiKey as unknown as jest.Mock;
const mockPrisma = prisma as unknown as Record<string, Record<string, jest.Mock>>;

describe("GET /api/api-keys", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns list of user's keys with metadata only", async () => {
    const mockKeys = [
      {
        id: "k1",
        name: "Production",
        keyPrefix: "abc123",
        lastUsedAt: new Date("2025-01-01"),
        expiresAt: null,
        revokedAt: null,
        createdAt: new Date("2024-12-01"),
      },
    ];

    mockAuthenticateRequest.mockResolvedValue({ userId: "u1" });
    mockPrisma.apiKey.findMany.mockResolvedValue(mockKeys);

    const request = { headers: new Headers() } as unknown as NextRequest;
    const res = (await GET(request)) as NextResponse;

    expect(res.status).toBe(200);
    const body = await res.json();
    // Compare the structure, dates are serialized to ISO strings in JSON
    expect(body.keys.length).toBe(1);
    expect(body.keys[0].id).toBe("k1");
    expect(body.keys[0].name).toBe("Production");
    expect(body.keys[0].keyPrefix).toBe("abc123");
    expect(mockPrisma.apiKey.findMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns 401 if not authenticated", async () => {
    mockAuthenticateRequest.mockResolvedValue({
      response: { status: 401, json: async () => ({ error: "Unauthorized" }) },
    });

    const request = { headers: new Headers() } as unknown as NextRequest;
    const res = (await GET(request)) as NextResponse;

    expect(res.status).toBe(401);
  });

  it("never returns hashedKey or fullKey", async () => {
    const mockKeys = [
      {
        id: "k1",
        name: "Test",
        keyPrefix: "prefix",
        lastUsedAt: null,
        expiresAt: null,
        revokedAt: null,
        createdAt: new Date(),
      },
    ];

    mockAuthenticateRequest.mockResolvedValue({ userId: "u1" });
    mockPrisma.apiKey.findMany.mockResolvedValue(mockKeys);

    const request = { headers: new Headers() } as unknown as NextRequest;
    const res = (await GET(request)) as NextResponse;
    const body = await res.json();

    expect(body.keys[0]).not.toHaveProperty("hashedKey");
    expect(body.keys[0]).not.toHaveProperty("fullKey");
  });
});

describe("POST /api/api-keys", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates an API key and returns plaintext key once", async () => {
    const mockFullKey = "fcal_abc123_secret";
    const mockKeyData = {
      id: "k1",
      name: "Production",
      keyPrefix: "abc123",
      createdAt: new Date(),
    };

    mockAuthenticateRequest.mockResolvedValue({ userId: "u1" });
    mockGenerateApiKey.mockReturnValue({
      fullKey: mockFullKey,
      keyPrefix: "abc123",
      hashedKey: "hashed...",
    });
    mockPrisma.apiKey.create.mockResolvedValue(mockKeyData);

    const request = {
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ name: "Production" }),
    } as unknown as NextRequest;

    const res = (await POST(request)) as NextResponse;

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.key).toBe(mockFullKey);
    expect(body.id).toBe("k1");
    expect(body.name).toBe("Production");
    expect(body.keyPrefix).toBe("abc123");
  });

  it("stores hashedKey but returns plaintext key", async () => {
    mockAuthenticateRequest.mockResolvedValue({ userId: "u1" });
    mockGenerateApiKey.mockReturnValue({
      fullKey: "fcal_abc123_secret",
      keyPrefix: "abc123",
      hashedKey: "hashed_value",
    });
    mockPrisma.apiKey.create.mockResolvedValue({
      id: "k1",
      name: "Test",
      keyPrefix: "abc123",
      createdAt: new Date(),
    });

    const request = {
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ name: "Test" }),
    } as unknown as NextRequest;

    await POST(request);

    // Verify create was called with hashedKey
    const createCall = mockPrisma.apiKey.create.mock.calls[0];
    expect(createCall[0].data.hashedKey).toBe("hashed_value");
  });

  it("rejects empty name", async () => {
    mockAuthenticateRequest.mockResolvedValue({ userId: "u1" });

    const request = {
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ name: "" }),
    } as unknown as NextRequest;

    const res = (await POST(request)) as NextResponse;

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("name is required");
  });

  it("rejects name longer than 100 chars", async () => {
    mockAuthenticateRequest.mockResolvedValue({ userId: "u1" });

    const longName = "a".repeat(101);
    const request = {
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ name: longName }),
    } as unknown as NextRequest;

    const res = (await POST(request)) as NextResponse;

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("100 characters");
  });

  it("accepts optional expiresAt as ISO8601", async () => {
    const expiresAt = "2025-12-31T23:59:59Z";
    mockAuthenticateRequest.mockResolvedValue({ userId: "u1" });
    mockGenerateApiKey.mockReturnValue({
      fullKey: "fcal_abc123_secret",
      keyPrefix: "abc123",
      hashedKey: "hashed...",
    });
    mockPrisma.apiKey.create.mockResolvedValue({
      id: "k1",
      name: "Temporary",
      keyPrefix: "abc123",
      createdAt: new Date(),
    });

    const request = {
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ name: "Temporary", expiresAt }),
    } as unknown as NextRequest;

    const res = (await POST(request)) as NextResponse;

    expect(res.status).toBe(201);
    const createCall = mockPrisma.apiKey.create.mock.calls[0];
    expect(createCall[0].data.expiresAt).toEqual(new Date(expiresAt));
  });

  it("rejects invalid expiresAt date", async () => {
    mockAuthenticateRequest.mockResolvedValue({ userId: "u1" });

    const request = {
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ name: "Test", expiresAt: "not-a-date" }),
    } as unknown as NextRequest;

    const res = (await POST(request)) as NextResponse;

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("ISO8601");
  });

  it("returns 401 if not authenticated", async () => {
    mockAuthenticateRequest.mockResolvedValue({
      response: { status: 401, json: async () => ({ error: "Unauthorized" }) },
    });

    const request = {
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ name: "Test" }),
    } as unknown as NextRequest;

    const res = (await POST(request)) as NextResponse;

    expect(res.status).toBe(401);
  });
});
