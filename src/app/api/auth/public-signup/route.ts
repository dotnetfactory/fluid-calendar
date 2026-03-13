import { NextResponse } from "next/server";

import { isPublicSignupEnabled } from "@/lib/auth/public-signup";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "PublicSignupAPI";

/**
 * GET endpoint to check if public signup is enabled
 */
export async function GET() {
  try {
    const isEnabled = await isPublicSignupEnabled();

    logger.info(
      "Public signup status checked via API",
      { isEnabled },
      LOG_SOURCE
    );

    return NextResponse.json({ enabled: isEnabled });
  } catch (error) {
    logger.error(
      "Error checking public signup status via API",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to check public signup status" },
      { status: 500 }
    );
  }
}
