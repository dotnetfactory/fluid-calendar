"use server";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "SetupActions";

/**
 * Checks if setup is needed by checking if any users exist in the database
 * @returns {Promise<{needsSetup: boolean}>} Object with needsSetup flag
 */
export async function checkSetupStatus() {
  try {
    const userCount = await prisma.user.count();

    logger.info("Checked if users exist", { userCount }, LOG_SOURCE);

    return { needsSetup: userCount === 0 };
  } catch (error) {
    logger.error(
      "Failed to check if users exist",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    // If there's an error, assume setup is needed
    return { needsSetup: true };
  }
}
