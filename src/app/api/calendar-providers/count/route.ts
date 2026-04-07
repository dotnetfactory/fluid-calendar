import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "calendar-providers-count";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const count = await prisma.connectedAccount.count({
      where: {
        userId,
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    logger.error(
      "Error fetching calendar provider count:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch calendar provider count" },
      { status: 500 }
    );
  }
}
