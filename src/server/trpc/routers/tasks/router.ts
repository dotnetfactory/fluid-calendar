import { TRPCError } from "@trpc/server";

import {
  createTask,
  deleteTask,
  getAllTasks,
  getTaskById,
  normalizeRecurrence,
  scheduleAllTasks,
  updateTask,
} from "@/lib/api/tasks";

import { createTRPCRouter, protectedProcedure } from "../../trpc";
import {
  CreateTaskInputSchema,
  DeleteTaskInputSchema,
  GetAllTasksInputSchema,
  GetTaskByIdInputSchema,
  NormalizeRecurrenceInputSchema,
  ScheduleAllTasksInputSchema,
  UpdateTaskInputSchema,
} from "./schemas";

/**
 * Tasks tRPC router
 * Handles all task-related operations with proper authentication and validation
 */
export const tasksRouter = createTRPCRouter({
  /**
   * Get all tasks for the authenticated user with optional filtering
   */
  getAll: protectedProcedure
    .input(GetAllTasksInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getAllTasks(ctx.userId, input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch tasks",
          cause: error,
        });
      }
    }),

  /**
   * Get a specific task by ID
   */
  getById: protectedProcedure
    .input(GetTaskByIdInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        const task = await getTaskById(ctx.userId, input);

        if (!task) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found",
          });
        }

        return task;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch task",
          cause: error,
        });
      }
    }),

  /**
   * Create a new task
   */
  create: protectedProcedure
    .input(CreateTaskInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createTask(ctx.userId, input);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Invalid recurrence rule"
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid recurrence rule provided",
            cause: error,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create task",
          cause: error,
        });
      }
    }),

  /**
   * Update an existing task
   */
  update: protectedProcedure
    .input(UpdateTaskInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { taskId, data } = input;
        return await updateTask(ctx.userId, taskId, data);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "Task not found") {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Task not found",
              cause: error,
            });
          }

          if (error.message === "Invalid recurrence rule") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid recurrence rule provided",
              cause: error,
            });
          }
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update task",
          cause: error,
        });
      }
    }),

  /**
   * Delete a task
   */
  delete: protectedProcedure
    .input(DeleteTaskInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { taskId } = input;
        return await deleteTask(ctx.userId, taskId);
      } catch (error) {
        if (error instanceof Error && error.message === "Task not found") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found",
            cause: error,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete task",
          cause: error,
        });
      }
    }),

  /**
   * Normalize a recurrence rule
   */
  normalizeRecurrence: protectedProcedure
    .input(NormalizeRecurrenceInputSchema)
    .mutation(async ({ input }) => {
      try {
        return await normalizeRecurrence(input);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Invalid recurrence rule"
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid recurrence rule provided",
            cause: error,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to normalize recurrence rule",
          cause: error,
        });
      }
    }),

  /**
   * Schedule all tasks for the authenticated user
   */
  scheduleAll: protectedProcedure
    .input(ScheduleAllTasksInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await scheduleAllTasks(ctx.userId, input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to schedule tasks",
          cause: error,
        });
      }
    }),
});
