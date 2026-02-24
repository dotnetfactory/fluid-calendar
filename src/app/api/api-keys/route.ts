import { NextRequest, NextResponse } from "next/server";

import { generateApiKey } from "@/lib/api-keys";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "api-keys-route";

/**
 * GET /api/api-keys
 * List all API keys for the authenticated user.
 * The actual key value is never returned — only metadata.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const keys = await prisma.apiKey.findMany({
      where: {
        userId: auth.userId,
        revokedAt: null,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(keys);
  } catch (error) {
    logger.error(
      "Error listing API keys",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to list API keys" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/api-keys
 * Create a new API key. The raw key is returned ONCE in the response.
 * Body: { name: string, scopes?: string[], expiresAt?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const body = await request.json();
    const { name, scopes, expiresAt } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "A name is required for the API key" },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: "Name must be 100 characters or fewer" },
        { status: 400 }
      );
    }

    // Limit the number of active keys per user
    const existingCount = await prisma.apiKey.count({
      where: { userId: auth.userId, revokedAt: null },
    });

    if (existingCount >= 25) {
      return NextResponse.json(
        { error: "Maximum of 25 active API keys per user" },
        { status: 400 }
      );
    }

    const { rawKey, keyHash, keyPrefix } = generateApiKey();

    const apiKey = await prisma.apiKey.create({
      data: {
        name: name.trim(),
        keyHash,
        keyPrefix,
        userId: auth.userId,
        scopes: JSON.stringify(Array.isArray(scopes) ? scopes : []),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Return the raw key ONCE — it cannot be retrieved again
    return NextResponse.json({
      ...apiKey,
      key: rawKey,
    });
  } catch (error) {
    logger.error(
      "Error creating API key",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}
