import { TRPCError } from "@trpc/server";

import {
  createProject,
  deleteProject,
  getAllProjects,
  getProjectById,
  updateProject,
} from "@/lib/api/projects";

import { createTRPCRouter, protectedProcedure } from "../../trpc";
import {
  CreateProjectInputSchema,
  DeleteProjectInputSchema,
  GetAllProjectsInputSchema,
  GetProjectByIdInputSchema,
  UpdateProjectInputSchema,
} from "./schemas";

/**
 * tRPC router for project operations
 * All procedures require authentication
 */
export const projectsRouter = createTRPCRouter({
  /**
   * Get all projects for the authenticated user
   */
  getAll: protectedProcedure
    .input(GetAllProjectsInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getAllProjects(ctx.userId, input || {});
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch projects",
          cause: error,
        });
      }
    }),

  /**
   * Get a specific project by ID
   */
  getById: protectedProcedure
    .input(GetProjectByIdInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        const project = await getProjectById(ctx.userId, {
          projectId: input.id,
          includeTasks: input.includeTasks,
        });

        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        return project;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch project",
          cause: error,
        });
      }
    }),

  /**
   * Create a new project
   */
  create: protectedProcedure
    .input(CreateProjectInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createProject(ctx.userId, input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create project",
          cause: error,
        });
      }
    }),

  /**
   * Update an existing project
   */
  update: protectedProcedure
    .input(UpdateProjectInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...updateData } = input;
        return await updateProject(ctx.userId, id, updateData);
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update project",
          cause: error,
        });
      }
    }),

  /**
   * Delete a project
   */
  delete: protectedProcedure
    .input(DeleteProjectInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteProject(ctx.userId, input.id);
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete project",
          cause: error,
        });
      }
    }),
});
