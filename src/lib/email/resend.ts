import { Resend } from "resend";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "ResendAPI";

let resendInstance: Resend | null = null;

/**
 * Gets or creates a Resend instance using the API key from SystemSettings
 */
export async function getResend(): Promise<Resend> {
  try {
    // If we already have an instance, return it
    if (resendInstance) {
      return resendInstance;
    }

    // Get the API key from SystemSettings
    const settings = await prisma.systemSettings.findFirst();
    if (!settings?.resendApiKey) {
      throw new Error("Resend API key not found in system settings");
    }

    // Create and cache the instance
    resendInstance = new Resend(settings.resendApiKey);
    return resendInstance;
  } catch (error) {
    logger.error(
      "Failed to initialize Resend",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    throw error;
  }
}

/**
 * Clears the cached Resend instance, forcing a new one to be created next time
 * This should be called when the API key is updated in SystemSettings
 */
export function clearResendInstance() {
  resendInstance = null;
}
