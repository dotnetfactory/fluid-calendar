import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "PublicSignup";

/**
 * Checks if public signup is enabled in the system settings
 * @returns {Promise<boolean>} Whether public signup is enabled
 */
export async function isPublicSignupEnabled(): Promise<boolean> {
  try {
    // Get the first system settings record (there should only be one)
    const systemSettings = await prisma.systemSettings.findFirst();

    // If no system settings exist, default to false
    if (!systemSettings) {
      logger.info(
        "No system settings found, defaulting public signup to false",
        {},
        LOG_SOURCE
      );
      return false;
    }

    logger.info(
      "Checked if public signup is enabled",
      { publicSignup: systemSettings.publicSignup },
      LOG_SOURCE
    );

    return systemSettings.publicSignup;
  } catch (error) {
    logger.error(
      "Error checking if public signup is enabled",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    // Default to false in case of error
    return false;
  }
}
