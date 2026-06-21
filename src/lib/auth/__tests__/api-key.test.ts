import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import {
  extractBearerKey,
  generateApiKey,
  hashKey,
  parseKey,
  requireV1Auth,
  verifyApiKey,
} from "@/lib/auth/api-key";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    apiKey: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    apiSettings: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock("next-auth/jwt", () => ({ getToken: jest.fn() }));

const mockApiKey = prisma.apiKey as unknown as {
  findUnique: jest.Mock;
  update: jest.Mock;
};
const mockApiSettings = prisma.apiSettings as unknown as {
  findUnique: jest.Mock;
};
const mockGetToken = getToken as unknown as jest.Mock;

function req(headers: Record<string, string>): NextRequest {
  return { headers: new Headers(headers) } as unknown as NextRequest;
}

beforeEach(() => jest.clearAllMocks());

describe("key generation + parsing", () => {
  it("generates a well-formed fcal token and a matching hash", () => {
    const { fullKey, keyPrefix, hashedKey } = generateApiKey();
    expect(fullKey).toMatch(/^fcal_[0-9a-f]{16}_[A-Za-z0-9_-]+$/);
    expect(fullKey.split("_")[1]).toBe(keyPrefix);
    expect(hashedKey).toBe(hashKey(fullKey));
    expect(hashedKey).toHaveLength(64); // sha256 hex
  });

  it("parses valid keys and rejects malformed ones", () => {
    const { fullKey, keyPrefix } = generateApiKey();
    expect(parseKey(fullKey)).toEqual({ keyPrefix });
    expect(parseKey("nope")).toBeNull();
    expect(parseKey("wrong_aaaa_bbbb")).toBeNull(); // bad product prefix
    expect(parseKey("fcal__bbbb")).toBeNull(); // empty prefix
  });

  it("extracts only fcal bearer tokens", () => {
    const { fullKey } = generateApiKey();
    expect(extractBearerKey(req({ authorization: `Bearer ${fullKey}` }))).toBe(
      fullKey
    );
    expect(extractBearerKey(req({ authorization: "Bearer xyz" }))).toBeNull();
    expect(extractBearerKey(req({}))).toBeNull();
  });
});

describe("verifyApiKey", () => {
  it("accepts a valid, enabled key and stamps lastUsedAt", async () => {
    const { fullKey, keyPrefix, hashedKey } = generateApiKey();
    mockApiKey.findUnique.mockResolvedValue({
      id: "k1",
      userId: "u1",
      hashedKey,
      revokedAt: null,
      expiresAt: null,
    });
    mockApiSettings.findUnique.mockResolvedValue({ enabled: true });

    await expect(verifyApiKey(fullKey)).resolves.toEqual({ userId: "u1" });
    expect(mockApiKey.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { keyPrefix } })
    );
    expect(mockApiKey.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "k1" } })
    );
  });

  it("rejects an unknown prefix", async () => {
    mockApiKey.findUnique.mockResolvedValue(null);
    await expect(verifyApiKey(generateApiKey().fullKey)).resolves.toEqual({
      error: "unauthorized",
    });
  });

  it("rejects a revoked key", async () => {
    const { fullKey, hashedKey } = generateApiKey();
    mockApiKey.findUnique.mockResolvedValue({
      id: "k1",
      userId: "u1",
      hashedKey,
      revokedAt: new Date(),
      expiresAt: null,
    });
    await expect(verifyApiKey(fullKey)).resolves.toEqual({
      error: "unauthorized",
    });
    expect(mockApiSettings.findUnique).not.toHaveBeenCalled();
  });

  it("rejects an expired key", async () => {
    const { fullKey, hashedKey } = generateApiKey();
    mockApiKey.findUnique.mockResolvedValue({
      id: "k1",
      userId: "u1",
      hashedKey,
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(verifyApiKey(fullKey)).resolves.toEqual({
      error: "unauthorized",
    });
  });

  it("returns forbidden when the per-user gate is disabled", async () => {
    const { fullKey, hashedKey } = generateApiKey();
    mockApiKey.findUnique.mockResolvedValue({
      id: "k1",
      userId: "u1",
      hashedKey,
      revokedAt: null,
      expiresAt: null,
    });
    mockApiSettings.findUnique.mockResolvedValue({ enabled: false });
    await expect(verifyApiKey(fullKey)).resolves.toEqual({
      error: "forbidden",
    });
    // Gate is checked before the hash compare (fail-fast) so update never fires.
    expect(mockApiKey.update).not.toHaveBeenCalled();
  });

  it("rejects a tampered secret with a matching prefix (hash mismatch)", async () => {
    const real = generateApiKey();
    // Same prefix, different secret -> different full key -> hash won't match.
    const forged = `fcal_${real.keyPrefix}_tamperedsecretvalue`;
    mockApiKey.findUnique.mockResolvedValue({
      id: "k1",
      userId: "u1",
      hashedKey: real.hashedKey,
      revokedAt: null,
      expiresAt: null,
    });
    mockApiSettings.findUnique.mockResolvedValue({ enabled: true });
    await expect(verifyApiKey(forged)).resolves.toEqual({
      error: "unauthorized",
    });
  });
});

describe("requireV1Auth", () => {
  it("authenticates via a valid API key", async () => {
    const { fullKey, hashedKey } = generateApiKey();
    mockApiKey.findUnique.mockResolvedValue({
      id: "k1",
      userId: "u1",
      hashedKey,
      revokedAt: null,
      expiresAt: null,
    });
    mockApiSettings.findUnique.mockResolvedValue({ enabled: true });
    await expect(
      requireV1Auth(req({ authorization: `Bearer ${fullKey}` }))
    ).resolves.toEqual({ userId: "u1", authMethod: "api_key" });
    expect(mockGetToken).not.toHaveBeenCalled();
  });

  it("falls back to a NextAuth session when no key is present", async () => {
    mockGetToken.mockResolvedValue({ sub: "u2" });
    await expect(requireV1Auth(req({}))).resolves.toEqual({
      userId: "u2",
      authMethod: "session",
    });
  });

  it("returns unauthorized with neither key nor session", async () => {
    mockGetToken.mockResolvedValue(null);
    await expect(requireV1Auth(req({}))).resolves.toEqual({
      error: "unauthorized",
    });
  });
});
