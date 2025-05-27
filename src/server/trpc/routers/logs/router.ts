import { TRPCError } from "@trpc/server";

import {
  cleanupExpiredLogs,
  deleteLogs,
  getLogSettings,
  getLogSources,
  getLogs,
  processBatchLogs,
  updateLogSettings,
} from "@/lib/api/logs";

import { adminProcedure, createTRPCRouter, publicProcedure } from "../../trpc";
import {
  BatchLogEntriesInputSchema,
  DeleteLogsInputSchema,
  GetLogsInputSchema,
  LogSettingsInputSchema,
} from "./schemas";

/**
 * Logs tRPC router
 * Handles all logging operations with admin-only access (except batch processing)
 */
export const logsRouter = createTRPCRouter({
  /**
   * Get logs with filtering and pagination (admin only)
   */
  get: adminProcedure.input(GetLogsInputSchema).query(async ({ input }) => {
    try {
      return await getLogs(input);
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch logs",
        cause: error,
      });
    }
  }),

  /**
   * Delete logs based on criteria (admin only)
   */
  delete: adminProcedure
    .input(DeleteLogsInputSchema)
    .mutation(async ({ input }) => {
      try {
        return await deleteLogs(input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete logs",
          cause: error,
        });
      }
    }),

  /**
   * Process batch log entries (public access for internal logging)
   */
  batch: publicProcedure
    .input(BatchLogEntriesInputSchema)
    .mutation(async ({ input }) => {
      try {
        return await processBatchLogs(input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to process batch logs",
          cause: error,
        });
      }
    }),

  /**
   * Cleanup expired logs (admin only)
   */
  cleanup: adminProcedure.mutation(async () => {
    try {
      return await cleanupExpiredLogs();
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to cleanup logs",
        cause: error,
      });
    }
  }),

  /**
   * Get log settings (admin only)
   */
  getSettings: adminProcedure.query(async () => {
    try {
      return await getLogSettings();
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch log settings",
        cause: error,
      });
    }
  }),

  /**
   * Update log settings (admin only)
   */
  updateSettings: adminProcedure
    .input(LogSettingsInputSchema)
    .mutation(async ({ input }) => {
      try {
        return await updateLogSettings(input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update log settings",
          cause: error,
        });
      }
    }),

  /**
   * Get all unique log sources (admin only)
   */
  getSources: adminProcedure.query(async () => {
    try {
      return await getLogSources();
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch log sources",
        cause: error,
      });
    }
  }),
});
