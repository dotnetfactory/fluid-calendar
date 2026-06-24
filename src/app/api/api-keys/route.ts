import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { generateApiKey } from "@/lib/auth/api-key";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "ApiKeysRoute";

/**
 * GET /api/api-keys — List the user's API keys (metadata only).
 *
 * Returns keys with id, name, keyPrefix, lastUsedAt, expiresAt, revokedAt, createdAt.
 * Never includes hashedKey or fullKey.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const keys = await prisma.apiKey.findMany({
      where: { userId },
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

    return NextResponse.json({ keys });
  } catch (error) {
    logger.error(
      "Failed to list API keys",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to list API keys" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/api-keys — Create a new API key.
 *
 * Body: { name: string, expiresAt?: ISO8601 }
 * Validates name is non-empty and <= 100 chars.
 * Returns the plaintext key ONCE; stores only the hash.
 * Returns 201 with { id, name, keyPrefix, createdAt, key }.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;
    const body = await request.json();
    const { name, expiresAt } = body;

    // Validate name
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "name is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: "name must be 100 characters or less" },
        { status: 400 }
      );
    }

    // Generate the API key
    const { fullKey, keyPrefix, hashedKey } = generateApiKey();

    // Parse and validate expiresAt if provided
    let expiresAtDate: Date | undefined;
    if (expiresAt) {
      expiresAtDate = new Date(expiresAt);
      if (isNaN(expiresAtDate.getTime())) {
        return NextResponse.json(
          { error: "expiresAt must be a valid ISO8601 date" },
          { status: 400 }
        );
      }
    }

    // Create the API key record
    const apiKey = await prisma.apiKey.create({
      data: {
        userId,
        name: name.trim(),
        keyPrefix,
        hashedKey,
        expiresAt: expiresAtDate,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        createdAt: true,
      },
    });

    logger.info(
      "Created API key",
      { userId, keyId: apiKey.id },
      LOG_SOURCE
    );

    return NextResponse.json(
      {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        createdAt: apiKey.createdAt,
        key: fullKey,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error(
      "Failed to create API key",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}
