import { TRPCError } from "@trpc/server";

import { getSettings, updateSettings } from "@/lib/api/settings";

import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { GetSettingsInputSchema, UpdateSettingsInputSchema } from "./schemas";

/**
 * Settings tRPC router
 * Handles all settings-related operations with proper authentication and validation
 */
export const settingsRouter = createTRPCRouter({
  /**
   * Get settings by type for the authenticated user
   */
  get: protectedProcedure
    .input(GetSettingsInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getSettings(ctx.userId, input);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("Unknown settings type")
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
            cause: error,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch settings",
          cause: error,
        });
      }
    }),

  /**
   * Update settings by type for the authenticated user
   */
  update: protectedProcedure
    .input(UpdateSettingsInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateSettings(ctx.userId, input);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("Unknown settings type")
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
            cause: error,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update settings",
          cause: error,
        });
      }
    }),
});
