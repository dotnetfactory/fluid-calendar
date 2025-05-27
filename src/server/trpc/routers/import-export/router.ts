import { TRPCError } from "@trpc/server";

import { exportTasks, importTasks } from "@/lib/api/import-export";

import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { ExportTasksInputSchema, ImportTasksInputSchema } from "./schemas";

/**
 * Import/Export tRPC router
 * Handles task import and export operations with proper authentication and validation
 */
export const importExportRouter = createTRPCRouter({
  /**
   * Export tasks with related data
   */
  exportTasks: protectedProcedure
    .input(ExportTasksInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await exportTasks(ctx.userId, input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to export tasks",
          cause: error,
        });
      }
    }),

  /**
   * Import tasks with related data
   */
  importTasks: protectedProcedure
    .input(ImportTasksInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await importTasks(ctx.userId, input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to import tasks",
          cause: error,
        });
      }
    }),
});
