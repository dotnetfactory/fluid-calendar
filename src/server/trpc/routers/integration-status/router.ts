import { TRPCError } from "@trpc/server";

import { getIntegrationStatus } from "@/lib/api/integration-status";

import { createTRPCRouter, protectedProcedure } from "../../trpc";

/**
 * Integration Status tRPC router
 * Handles integration status checks with proper authentication
 */
export const integrationStatusRouter = createTRPCRouter({
  /**
   * Get integration status for all supported providers
   */
  get: protectedProcedure.query(async () => {
    try {
      return await getIntegrationStatus();
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch integration status",
        cause: error,
      });
    }
  }),
});
