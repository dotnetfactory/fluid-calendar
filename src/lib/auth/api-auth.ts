import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import { hashApiKey, isValidApiKeyFormat } from "@/lib/api-keys";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const LOG_SOURCE = "APIAuth";

/**
 * Authenticates a request using either a session token (NextAuth JWT) or an API key.
 *
 * API keys are passed via the Authorization header: `Authorization: Bearer fc_...`
 *
 * @param request The NextRequest object
 * @param logSource The source for logging
 * @returns An object with userId if authenticated, or a NextResponse if unauthorized
 */
export async function authenticateRequest(
  request: NextRequest,
  logSource: string
) {
  // Check for API key in Authorization header first
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (isValidApiKeyFormat(token)) {
      return authenticateWithApiKey(token, logSource);
    }
  }

  // Fall back to session-based auth (NextAuth JWT)
  const sessionToken = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!sessionToken) {
    logger.warn("Unauthorized access attempt to API", {}, logSource);
    return { response: new NextResponse("Unauthorized", { status: 401 }) };
  }

  const userId = sessionToken.sub;
  if (!userId) {
    logger.warn("No user ID found in token", {}, logSource);
    return { response: new NextResponse("Unauthorized", { status: 401 }) };
  }

  return { userId };
}

/**
 * Authenticates a request using an API key.
 */
async function authenticateWithApiKey(rawKey: string, logSource: string) {
  const keyHash = hashApiKey(rawKey);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
  });

  if (!apiKey) {
    logger.warn("Invalid API key used", {}, logSource);
    return {
      response: NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      ),
    };
  }

  if (apiKey.revokedAt) {
    logger.warn("Revoked API key used", { keyPrefix: apiKey.keyPrefix }, logSource);
    return {
      response: NextResponse.json(
        { error: "API key has been revoked" },
        { status: 401 }
      ),
    };
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    logger.warn("Expired API key used", { keyPrefix: apiKey.keyPrefix }, logSource);
    return {
      response: NextResponse.json(
        { error: "API key has expired" },
        { status: 401 }
      ),
    };
  }

  // Rate limit: 100 requests per minute per API key
  const rateLimit = checkRateLimit(`apikey:${apiKey.id}`, 100, 60 * 1000);
  if (!rateLimit.allowed) {
    logger.warn("Rate limit exceeded for API key", { keyPrefix: apiKey.keyPrefix }, logSource);
    return {
      response: NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetAt / 1000)),
            "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          },
        }
      ),
    };
  }

  // Update lastUsedAt in the background (fire-and-forget)
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // Swallow errors from background update
    });

  return {
    userId: apiKey.userId,
    rateLimitHeaders: {
      "X-RateLimit-Limit": String(rateLimit.limit),
      "X-RateLimit-Remaining": String(rateLimit.remaining),
      "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetAt / 1000)),
    },
  };
}

/**
 * Middleware to ensure a user is authenticated for API routes
 * @param req The Next.js request object
 * @returns A response if authentication fails, or null if authentication succeeds
 */
export async function requireAuth(
  req: NextRequest
): Promise<NextResponse | null> {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      logger.warn(
        "Unauthenticated API access attempt",
        { path: req.nextUrl.pathname },
        LOG_SOURCE
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return null; // Authentication successful
  } catch (error) {
    logger.error(
      "Error in API authentication",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        path: req.nextUrl.pathname,
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Middleware to ensure a user is an admin for API routes
 * @param req The Next.js request object
 * @returns A response if authorization fails, or null if authorization succeeds
 */
export async function requireAdmin(
  req: NextRequest
): Promise<NextResponse | null> {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      logger.warn(
        "Unauthenticated admin API access attempt",
        { path: req.nextUrl.pathname },
        LOG_SOURCE
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (token.role !== "admin") {
      logger.warn(
        "Non-admin user attempted to access admin API",
        { userId: token.sub ?? "unknown", path: req.nextUrl.pathname },
        LOG_SOURCE
      );

      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return null; // Authorization successful
  } catch (error) {
    logger.error(
      "Error in API admin authorization",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        path: req.nextUrl.pathname,
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
