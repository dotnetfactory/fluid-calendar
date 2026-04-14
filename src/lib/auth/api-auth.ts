import { createHash } from "crypto";

import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "APIAuth";

/**
 * Hash an API key for storage/lookup
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Authenticates a request via NextAuth session OR API key (Bearer token)
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
    const apiKey = authHeader.slice(7);
    const keyHash = hashApiKey(apiKey);

    const keyRecord = await prisma.apiKey.findUnique({
      where: { keyHash },
    });

    if (keyRecord) {
      // Update lastUsed timestamp (fire and forget)
      prisma.apiKey
        .update({
          where: { id: keyRecord.id },
          data: { lastUsed: new Date() },
        })
        .catch((err) =>
          logger.warn("Failed to update API key lastUsed", { error: String(err) }, LOG_SOURCE)
        );

      return { userId: keyRecord.userId };
    }

    logger.warn("Invalid API key", {}, logSource);
    return { response: new NextResponse("Unauthorized", { status: 401 }) };
  }

  // Fall back to NextAuth session
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    logger.warn("Unauthorized access attempt to API", {}, logSource);
    return { response: new NextResponse("Unauthorized", { status: 401 }) };
  }

  const userId = token.sub;
  if (!userId) {
    logger.warn("No user ID found in token", {}, logSource);
    return { response: new NextResponse("Unauthorized", { status: 401 }) };
  }

  return { userId };
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
