import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "OmniFocusSyncAckAPI";

/**
 * POST /api/sync/omnifocus/ack
 *
 * Marks TaskChange records as synced after the sync script
 * successfully pushes them to OmniFocus.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const { changeIds } = await request.json();

    if (!Array.isArray(changeIds) || changeIds.length === 0) {
      return NextResponse.json(
        { error: "changeIds array is required" },
        { status: 400 }
      );
    }

    const result = await prisma.taskChange.updateMany({
      where: {
        id: { in: changeIds },
        userId: auth.userId,
      },
      data: {
        synced: true,
      },
    });

    logger.info(
      `Acknowledged ${result.count} sync changes`,
      { changeIds },
      LOG_SOURCE
    );

    return NextResponse.json({ acknowledged: result.count });
  } catch (error) {
    logger.error(
      "Failed to acknowledge sync changes",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to acknowledge changes" },
      { status: 500 }
    );
  }
}
