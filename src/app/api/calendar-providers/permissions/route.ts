import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { checkCalendarProviderPermission } from "@saas/services/calendar-provider-permissions";

const LOG_SOURCE = "CalendarProviderPermissionsAPI";

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in authResult) {
      return authResult.response;
    }
    const { userId } = authResult;

    // Check calendar provider permissions
    const permissionResult = await checkCalendarProviderPermission(userId);

    logger.debug(
      "Calendar provider permission check completed",
      {
        userId,
        canAdd: permissionResult.canAdd,
        currentUsage: permissionResult.currentUsage,
        limit: permissionResult.limit ?? null,
        upgradeRequired: permissionResult.upgradeRequired ?? false,
      },
      LOG_SOURCE
    );

    return NextResponse.json(permissionResult);
  } catch (error) {
    logger.error(
      "Failed to check calendar provider permissions",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to check permissions" },
      { status: 500 }
    );
  }
}
