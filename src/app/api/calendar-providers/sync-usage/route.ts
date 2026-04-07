import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { syncCalendarProviderUsage } from "@saas/services/calendar-provider-permissions";

const LOG_SOURCE = "CalendarProviderSyncUsageAPI";

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in authResult) {
      return authResult.response;
    }
    const { userId } = authResult;

    // Sync calendar provider usage with actual account count
    await syncCalendarProviderUsage(userId);

    logger.debug(
      "Calendar provider usage synced successfully",
      { userId },
      LOG_SOURCE
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "Failed to sync calendar provider usage",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to sync usage" },
      { status: 500 }
    );
  }
}
