import { createHash, randomBytes, timingSafeEqual } from "crypto";

import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "ApiKeyAuth";

/**
 * Programmatic API key auth for the /api/v1 surface (issue #160).
 *
 * Token shape: `fcal_<prefix>_<secret>`
 *  - `prefix` is a public, indexed lookup id (safe to display in the UI).
 *  - `secret` is high-entropy random; only the SHA-256 of the FULL token is stored.
 *
 * SHA-256 (not bcrypt) is correct here: keys are 256-bit random secrets, not
 * low-entropy passwords, so there is nothing to brute-force and we want a fast,
 * constant-time compare on the hot path.
 */

const KEY_PRODUCT_PREFIX = "fcal";
const PREFIX_BYTES = 8; // 16 hex chars — indexed lookup id
const SECRET_BYTES = 32; // 256-bit secret

export type ApiKeyError = "unauthorized" | "forbidden";

/** Generate a new key. The plaintext is returned ONCE and never stored. */
export function generateApiKey(): {
  fullKey: string;
  keyPrefix: string;
  hashedKey: string;
} {
  const keyPrefix = randomBytes(PREFIX_BYTES).toString("hex");
  const secret = randomBytes(SECRET_BYTES).toString("base64url");
  const fullKey = `${KEY_PRODUCT_PREFIX}_${keyPrefix}_${secret}`;
  return { fullKey, keyPrefix, hashedKey: hashKey(fullKey) };
}

/** SHA-256 hex of the full token. */
export function hashKey(fullKey: string): string {
  return createHash("sha256").update(fullKey).digest("hex");
}

/** Parse a token into its prefix, or null if it isn't a well-formed fcal key. */
export function parseKey(
  fullKey: string
): { keyPrefix: string } | null {
  // Split on only the first two underscores: the prefix is hex (underscore-free)
  // but the base64url secret may itself contain `_`, so a naive split over-splits.
  const first = fullKey.indexOf("_");
  const second = fullKey.indexOf("_", first + 1);
  if (first === -1 || second === -1) return null;
  const product = fullKey.slice(0, first);
  const keyPrefix = fullKey.slice(first + 1, second);
  const secret = fullKey.slice(second + 1);
  if (product !== KEY_PRODUCT_PREFIX || !keyPrefix || !secret) return null;
  return { keyPrefix };
}

/** Constant-time hex-string compare that never throws on length mismatch. */
function safeHashEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/** Extract the `fcal_` bearer token from a request, or null if not present. */
export function extractBearerKey(request: NextRequest): string | null {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token.startsWith(`${KEY_PRODUCT_PREFIX}_`) ? token : null;
}

/**
 * Validate a full key and return the owning userId, or an error code.
 * Order is deliberate (fail-fast, least work on bad input):
 *   parse → prefix lookup → revoked/expired → enable-gate → constant-time hash.
 * The full key is never logged.
 */
export async function verifyApiKey(
  fullKey: string
): Promise<{ userId: string } | { error: ApiKeyError }> {
  const parsed = parseKey(fullKey);
  if (!parsed) return { error: "unauthorized" };

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyPrefix: parsed.keyPrefix },
    select: {
      id: true,
      userId: true,
      hashedKey: true,
      revokedAt: true,
      expiresAt: true,
    },
  });

  if (!apiKey) return { error: "unauthorized" };
  if (apiKey.revokedAt) return { error: "unauthorized" };
  if (apiKey.expiresAt && apiKey.expiresAt.getTime() <= Date.now()) {
    return { error: "unauthorized" };
  }

  // Per-user master gate (default-deny). Checked before the hash compare so a
  // disabled account can't be used to burn CPU on hashing.
  const settings = await prisma.apiSettings.findUnique({
    where: { userId: apiKey.userId },
    select: { enabled: true },
  });
  if (!settings?.enabled) return { error: "forbidden" };

  if (!safeHashEqual(hashKey(fullKey), apiKey.hashedKey)) {
    return { error: "unauthorized" };
  }

  // Fire-and-forget; never block the request on the audit write.
  prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch((error) =>
      logger.error(
        "Failed to update apiKey.lastUsedAt",
        { error: error instanceof Error ? error.message : "unknown" },
        LOG_SOURCE
      )
    );

  return { userId: apiKey.userId };
}

export type V1Auth =
  | { userId: string; authMethod: "api_key" | "session" }
  | { error: ApiKeyError };

/**
 * Authenticate an /api/v1 request via API key OR NextAuth session.
 * Returns an error code (callers map to the v1 error envelope) rather than a
 * NextResponse, so the envelope lives in one place (lib/api/respond).
 */
export async function requireV1Auth(request: NextRequest): Promise<V1Auth> {
  const key = extractBearerKey(request);
  if (key) {
    const result = await verifyApiKey(key);
    if ("error" in result) return result;
    return { userId: result.userId, authMethod: "api_key" };
  }

  // Fall back to a logged-in browser session so the in-app docs/UI can call v1.
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (token?.sub) return { userId: token.sub, authMethod: "session" };

  return { error: "unauthorized" };
}
