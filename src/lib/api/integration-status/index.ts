import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import { type IntegrationStatusOutput } from "./schemas";

const LOG_SOURCE = "IntegrationStatusAPI";

/**
 * Get integration status for all supported providers
 */
export async function getIntegrationStatus(): Promise<IntegrationStatusOutput> {
  logger.info("Getting integration status", {}, LOG_SOURCE);

  // Get system settings
  const settings = await prisma.systemSettings.findFirst();

  const status = {
    google: {
      configured: !!(settings?.googleClientId && settings?.googleClientSecret),
    },
    outlook: {
      configured: !!(
        settings?.outlookClientId &&
        settings?.outlookClientSecret &&
        settings?.outlookTenantId
      ),
    },
  };

  logger.info(
    "Retrieved integration status",
    {
      googleConfigured: status.google.configured,
      outlookConfigured: status.outlook.configured,
    },
    LOG_SOURCE
  );

  return status;
}
