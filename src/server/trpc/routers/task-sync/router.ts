import { TRPCError } from "@trpc/server";

import {
  createTaskMapping,
  createTaskProvider,
  deleteTaskMapping,
  deleteTaskProvider,
  getAllTaskMappings,
  getAllTaskProviders,
  getProviderLists,
  getTaskMappingById,
  getTaskProviderById,
  triggerSync,
  updateTaskMapping,
  updateTaskProvider,
} from "@/lib/api/task-sync";

import { createTRPCRouter, protectedProcedure } from "../../trpc";
import {
  CreateTaskMappingInputSchema,
  CreateTaskProviderInputSchema,
  DeleteTaskMappingInputSchema,
  DeleteTaskProviderInputSchema,
  GetAllTaskMappingsInputSchema,
  GetAllTaskProvidersInputSchema,
  GetProviderListsInputSchema,
  GetTaskMappingByIdInputSchema,
  GetTaskProviderByIdInputSchema,
  TriggerSyncInputSchema,
  UpdateTaskMappingInputSchema,
  UpdateTaskProviderInputSchema,
} from "./schemas";

export const taskSyncRouter = createTRPCRouter({
  // Task Provider procedures
  providers: createTRPCRouter({
    getAll: protectedProcedure
      .input(GetAllTaskProvidersInputSchema)
      .query(async ({ ctx, input }) => {
        try {
          return await getAllTaskProviders(ctx.userId, input);
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Failed to get task providers",
          });
        }
      }),

    getById: protectedProcedure
      .input(GetTaskProviderByIdInputSchema)
      .query(async ({ ctx, input }) => {
        try {
          const provider = await getTaskProviderById(ctx.userId, input);
          if (!provider) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Task provider not found",
            });
          }
          return provider;
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Failed to get task provider",
          });
        }
      }),

    create: protectedProcedure
      .input(CreateTaskProviderInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await createTaskProvider(ctx.userId, input);
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Failed to create task provider",
          });
        }
      }),

    update: protectedProcedure
      .input(UpdateTaskProviderInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const { providerId, ...updateData } = input;
          return await updateTaskProvider(ctx.userId, providerId, updateData);
        } catch (error) {
          if (error instanceof Error && error.message.includes("not found")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: error.message,
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Failed to update task provider",
          });
        }
      }),

    delete: protectedProcedure
      .input(DeleteTaskProviderInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await deleteTaskProvider(ctx.userId, input);
        } catch (error) {
          if (error instanceof Error && error.message.includes("not found")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: error.message,
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Failed to delete task provider",
          });
        }
      }),

    getLists: protectedProcedure
      .input(GetProviderListsInputSchema)
      .query(async ({ ctx, input }) => {
        try {
          return await getProviderLists(ctx.userId, input);
        } catch (error) {
          if (error instanceof Error && error.message.includes("not found")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: error.message,
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Failed to get provider lists",
          });
        }
      }),
  }),

  // Task Mapping procedures
  mappings: createTRPCRouter({
    getAll: protectedProcedure
      .input(GetAllTaskMappingsInputSchema)
      .query(async ({ ctx, input }) => {
        try {
          return await getAllTaskMappings(ctx.userId, input);
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Failed to get task mappings",
          });
        }
      }),

    getById: protectedProcedure
      .input(GetTaskMappingByIdInputSchema)
      .query(async ({ ctx, input }) => {
        try {
          const mapping = await getTaskMappingById(ctx.userId, input);
          if (!mapping) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Task mapping not found",
            });
          }
          return mapping;
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Failed to get task mapping",
          });
        }
      }),

    create: protectedProcedure
      .input(CreateTaskMappingInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await createTaskMapping(ctx.userId, input);
        } catch (error) {
          if (error instanceof Error && error.message.includes("not found")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: error.message,
            });
          }
          if (
            error instanceof Error &&
            error.message.includes("already exists")
          ) {
            throw new TRPCError({
              code: "CONFLICT",
              message: error.message,
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Failed to create task mapping",
          });
        }
      }),

    update: protectedProcedure
      .input(UpdateTaskMappingInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const { mappingId, ...updateData } = input;
          return await updateTaskMapping(ctx.userId, mappingId, updateData);
        } catch (error) {
          if (error instanceof Error && error.message.includes("not found")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: error.message,
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Failed to update task mapping",
          });
        }
      }),

    delete: protectedProcedure
      .input(DeleteTaskMappingInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await deleteTaskMapping(ctx.userId, input);
        } catch (error) {
          if (error instanceof Error && error.message.includes("not found")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: error.message,
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Failed to delete task mapping",
          });
        }
      }),
  }),

  // Sync procedures
  sync: createTRPCRouter({
    trigger: protectedProcedure
      .input(TriggerSyncInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await triggerSync(ctx.userId, input);
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              error instanceof Error ? error.message : "Failed to trigger sync",
          });
        }
      }),
  }),
});
