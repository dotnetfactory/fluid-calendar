import { TRPCError } from "@trpc/server";

import {
  createTag,
  deleteTag,
  getAllTags,
  getTagById,
  updateTag,
} from "@/lib/api/tags";

import { createTRPCRouter, protectedProcedure } from "../../trpc";
import {
  CreateTagInputSchema,
  DeleteTagInputSchema,
  GetAllTagsInputSchema,
  GetTagByIdInputSchema,
  UpdateTagInputSchema,
} from "./schemas";

/**
 * tRPC router for tag operations
 * All procedures require authentication
 */
export const tagsRouter = createTRPCRouter({
  /**
   * Get all tags for the authenticated user
   */
  getAll: protectedProcedure
    .input(GetAllTagsInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getAllTags(ctx.userId, input || {});
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch tags",
          cause: error,
        });
      }
    }),

  /**
   * Get a specific tag by ID
   */
  getById: protectedProcedure
    .input(GetTagByIdInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        const tag = await getTagById(ctx.userId, { tagId: input.id });

        if (!tag) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tag not found",
          });
        }

        return tag;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch tag",
          cause: error,
        });
      }
    }),

  /**
   * Create a new tag
   */
  create: protectedProcedure
    .input(CreateTagInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createTag(ctx.userId, input);
      } catch (error) {
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
          message: "Failed to create tag",
          cause: error,
        });
      }
    }),

  /**
   * Update an existing tag
   */
  update: protectedProcedure
    .input(UpdateTagInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...updateData } = input;
        return await updateTag(ctx.userId, id, updateData);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("not found")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: error.message,
            });
          }
          if (error.message.includes("already exists")) {
            throw new TRPCError({
              code: "CONFLICT",
              message: error.message,
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update tag",
          cause: error,
        });
      }
    }),

  /**
   * Delete a tag
   */
  delete: protectedProcedure
    .input(DeleteTagInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await deleteTag(ctx.userId, input.id);
        return { success: true };
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete tag",
          cause: error,
        });
      }
    }),
});
