import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "HomepageSettingAPI";

/**
 * Public API endpoint to check if the homepage is disabled
 * This is used by the middleware to determine if the homepage should be shown
 * or if users should be redirected to login/calendar
 */
export async function GET(request: NextRequest) {
  try {
    // Check if this is an internal request from middleware
    const internalRequest =
      request.headers.get("X-Internal-Request") === "true";

    // If it's not an internal request, verify it's coming from our domain
    if (!internalRequest) {
      const referer = request.headers.get("referer");
      const host = request.headers.get("host");

      // If this is not a request from our own domain, return 403
      if (!referer || !host || !referer.includes(host)) {
        return NextResponse.json(
          { error: "Unauthorized access" },
          { status: 403 }
        );
      }
    }

    // Get the system settings
    const settings = await prisma.systemSettings.findFirst();

    // Return the homepage disabled setting
    return NextResponse.json(
      {
        disabled: settings?.disableHomepage ?? false,
      },
      {
        headers: {
          // Set cache-control headers to prevent caching
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      }
    );
  } catch (error) {
    logger.error(
      "Failed to fetch homepage setting",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    // Return default value in case of error
    return NextResponse.json({ disabled: false });
  }
}
