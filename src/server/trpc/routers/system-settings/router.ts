import { TRPCError } from "@trpc/server";

import {
  getHomepageDisabledStatus,
  getSystemSettings,
  updateSystemSettings,
} from "@/lib/api/system-settings";

import { adminProcedure, createTRPCRouter, publicProcedure } from "../../trpc";
import {
  GetHomepageDisabledInputSchema,
  UpdateSystemSettingsInputSchema,
} from "./schemas";

/**
 * System Settings tRPC router
 * Handles system-wide settings operations with admin-only access
 */
export const systemSettingsRouter = createTRPCRouter({
  /**
   * Get system settings (admin only)
   */
  get: adminProcedure.query(async () => {
    try {
      return await getSystemSettings();
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch system settings",
        cause: error,
      });
    }
  }),

  /**
   * Update system settings (admin only)
   */
  update: adminProcedure
    .input(UpdateSystemSettingsInputSchema)
    .mutation(async ({ input }) => {
      try {
        return await updateSystemSettings(input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update system settings",
          cause: error,
        });
      }
    }),

  /**
   * Get homepage disabled status (public access for middleware)
   */
  getHomepageDisabled: publicProcedure
    .input(GetHomepageDisabledInputSchema)
    .query(async ({ input }) => {
      try {
        return await getHomepageDisabledStatus(input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch homepage disabled status",
          cause: error,
        });
      }
    }),
});
