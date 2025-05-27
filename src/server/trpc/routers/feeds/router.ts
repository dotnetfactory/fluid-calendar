import { TRPCError } from "@trpc/server";

import {
  batchUpdateFeeds,
  createFeed,
  deleteFeed,
  getAllFeeds,
  getFeedById,
  syncFeedEvents,
  updateFeed,
} from "@/lib/api/feeds";

import { createTRPCRouter, protectedProcedure } from "../../trpc";
import {
  BatchUpdateFeedsInputSchema,
  CreateFeedInputSchema,
  DeleteFeedInputSchema,
  GetAllFeedsInputSchema,
  GetFeedByIdInputSchema,
  SyncFeedEventsInputSchema,
  UpdateFeedInputSchema,
} from "./schemas";

/**
 * Calendar Feeds tRPC router
 * Handles all calendar feed-related operations with proper authentication and validation
 */
export const feedsRouter = createTRPCRouter({
  /**
   * Get all calendar feeds for the authenticated user with optional filtering
   */
  getAll: protectedProcedure
    .input(GetAllFeedsInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getAllFeeds(ctx.userId, input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch calendar feeds",
          cause: error,
        });
      }
    }),

  /**
   * Get a specific calendar feed by ID
   */
  getById: protectedProcedure
    .input(GetFeedByIdInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        const feed = await getFeedById(ctx.userId, input);

        if (!feed) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Calendar feed not found",
          });
        }

        return feed;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch calendar feed",
          cause: error,
        });
      }
    }),

  /**
   * Create a new calendar feed
   */
  create: protectedProcedure
    .input(CreateFeedInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createFeed(ctx.userId, input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create calendar feed",
          cause: error,
        });
      }
    }),

  /**
   * Update an existing calendar feed
   */
  update: protectedProcedure
    .input(UpdateFeedInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { feedId, data } = input;
        return await updateFeed(ctx.userId, feedId, data);
      } catch (error) {
        if (error instanceof Error && error.message === "Feed not found") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Calendar feed not found",
            cause: error,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update calendar feed",
          cause: error,
        });
      }
    }),

  /**
   * Batch update multiple calendar feeds
   */
  batchUpdate: protectedProcedure
    .input(BatchUpdateFeedsInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await batchUpdateFeeds(ctx.userId, input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to batch update calendar feeds",
          cause: error,
        });
      }
    }),

  /**
   * Delete a calendar feed
   */
  delete: protectedProcedure
    .input(DeleteFeedInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteFeed(ctx.userId, input);
      } catch (error) {
        if (error instanceof Error && error.message === "Feed not found") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Calendar feed not found",
            cause: error,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete calendar feed",
          cause: error,
        });
      }
    }),

  /**
   * Sync events for a calendar feed
   */
  syncEvents: protectedProcedure
    .input(SyncFeedEventsInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await syncFeedEvents(ctx.userId, input);
      } catch (error) {
        if (error instanceof Error && error.message === "Feed not found") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Calendar feed not found",
            cause: error,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to sync calendar feed events",
          cause: error,
        });
      }
    }),
});
