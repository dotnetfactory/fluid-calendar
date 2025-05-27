import { SystemSettings } from "@prisma/client";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import {
  type GetHomepageDisabledInput,
  GetHomepageDisabledInputSchema,
  type UpdateSystemSettingsInput,
  UpdateSystemSettingsInputSchema,
} from "./schemas";

const LOG_SOURCE = "SystemSettingsAPI";

/**
 * Get system settings (creates default if none exist)
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  logger.info("Getting system settings", {}, LOG_SOURCE);

  // Get the first system settings record, or create it if it doesn't exist
  const settings = await prisma.$transaction(async (tx) => {
    // Check if any SystemSettings record exists
    const existingSettings = await tx.systemSettings.findFirst();

    if (existingSettings) {
      return existingSettings;
    } else {
      // Create a new record with default ID
      return tx.systemSettings.create({
        data: {
          id: "default",
          logLevel: "none",
          disableHomepage: false,
        },
      });
    }
  });

  logger.info(
    "Retrieved system settings",
    { settingsId: settings.id },
    LOG_SOURCE
  );

  return settings;
}

/**
 * Get homepage disabled status
 */
export async function getHomepageDisabledStatus(
  input: GetHomepageDisabledInput
): Promise<{ disabled: boolean }> {
  GetHomepageDisabledInputSchema.parse(input);

  logger.info("Getting homepage disabled status", {}, LOG_SOURCE);

  try {
    // Get the system settings
    const settings = await prisma.systemSettings.findFirst();

    const disabled = settings?.disableHomepage ?? false;

    logger.info("Retrieved homepage disabled status", { disabled }, LOG_SOURCE);

    return { disabled };
  } catch (error) {
    logger.error(
      "Failed to fetch homepage setting",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    // Return default value in case of error
    return { disabled: false };
  }
}

/**
 * Update system settings
 */
export async function updateSystemSettings(
  input: UpdateSystemSettingsInput
): Promise<SystemSettings> {
  const validatedInput = UpdateSystemSettingsInputSchema.parse(input);

  logger.info(
    "Updating system settings",
    { updateCount: Object.keys(validatedInput).length },
    LOG_SOURCE
  );

  const settings = await prisma.$transaction(async (tx) => {
    // Check if any SystemSettings record exists
    const existingSettings = await tx.systemSettings.findFirst();

    if (existingSettings) {
      // Update the existing record
      return tx.systemSettings.update({
        where: { id: existingSettings.id },
        data: validatedInput,
      });
    } else {
      // Create a new record with default ID
      return tx.systemSettings.create({
        data: {
          id: "default",
          ...validatedInput,
        },
      });
    }
  });

  // Log if the homepage setting was updated
  if (
    "disableHomepage" in validatedInput &&
    validatedInput.disableHomepage !== undefined
  ) {
    logger.debug(
      `Homepage setting updated: ${validatedInput.disableHomepage}`,
      { disableHomepage: validatedInput.disableHomepage },
      LOG_SOURCE
    );
  }

  logger.info(
    "System settings updated successfully",
    { settingsId: settings.id },
    LOG_SOURCE
  );

  return settings;
}
