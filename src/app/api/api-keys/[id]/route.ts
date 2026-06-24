import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "ApiKeysDeleteRoute";

/**
 * DELETE /api/api-keys/[id] — Revoke an API key (soft-delete).
 *
 * Sets revokedAt to now. Only the owning user can revoke their own key.
 * Returns 404 if the key doesn't exist or doesn't belong to the user.
 * Returns { revoked: true, id }.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;
    const { id } = await params;

    // Soft-revoke: set revokedAt to now, scoped to userId
    const result = await prisma.apiKey.updateMany({
      where: {
        id,
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    logger.info(
      "Revoked API key",
      { userId, keyId: id },
      LOG_SOURCE
    );

    return NextResponse.json({
      revoked: true,
      id,
    });
  } catch (error) {
    logger.error(
      "Failed to revoke API key",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to revoke API key" },
      { status: 500 }
    );
  }
}
