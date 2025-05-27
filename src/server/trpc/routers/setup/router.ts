import { TRPCError } from "@trpc/server";

import { checkSetupStatus, performSetup } from "@/lib/api/setup";

import { createTRPCRouter, publicProcedure } from "../../trpc";
import { SetupInputSchema } from "./schemas";

/**
 * Setup tRPC router
 * Handles initial setup operations with public access (no authentication required)
 */
export const setupRouter = createTRPCRouter({
  /**
   * Check if setup is needed (public access)
   */
  checkStatus: publicProcedure.query(async () => {
    try {
      return await checkSetupStatus();
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to check setup status",
        cause: error,
      });
    }
  }),

  /**
   * Perform initial setup (public access)
   */
  perform: publicProcedure
    .input(SetupInputSchema)
    .mutation(async ({ input }) => {
      try {
        return await performSetup(input);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Setup has already been completed"
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Setup has already been completed",
            cause: error,
          });
        }

        if (
          error instanceof Error &&
          error.message === "SystemSettings record already exists"
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Setup has already been completed. System settings already exist.",
            cause: error,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to complete setup",
          cause: error,
        });
      }
    }),
});
