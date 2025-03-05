import { logger } from "@/lib/logger";

const LOG_SOURCE = "ClientPublicSignup";

/**
 * Client-side function to check if public signup is enabled
 * @returns {Promise<boolean>} Whether public signup is enabled
 */
export async function isPublicSignupEnabledClient(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/public-signup");

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    logger.info(
      "Checked if public signup is enabled (client)",
      { enabled: data.enabled },
      LOG_SOURCE
    );

    return data.enabled;
  } catch (error) {
    logger.error(
      "Error checking if public signup is enabled (client)",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    // Default to false in case of error
    return false;
  }
}
