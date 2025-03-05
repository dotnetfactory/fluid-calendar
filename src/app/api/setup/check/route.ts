import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "SetupCheckAPI";

/**
 * GET /api/setup/check
 * Checks if any users exist in the database
 * Used by middleware to determine if setup is needed
 */
export async function GET() {
  try {
    const userCount = await prisma.user.count();

    logger.info("Checked if users exist", { userCount }, LOG_SOURCE);

    return NextResponse.json({
      needsSetup: userCount === 0,
      userCount,
    });
  } catch (error) {
    logger.error(
      "Failed to check if users exist",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to check if users exist" },
      { status: 500 }
    );
  }
}
