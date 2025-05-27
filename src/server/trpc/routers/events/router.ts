import { TRPCError } from "@trpc/server";

import {
  createEvent,
  deleteEvent,
  getAllEvents,
  getEventById,
  updateEvent,
} from "@/lib/api/events";

import { createTRPCRouter, protectedProcedure } from "../../trpc";
import {
  CreateEventInputSchema,
  DeleteEventInputSchema,
  GetAllEventsInputSchema,
  GetEventByIdInputSchema,
  UpdateEventInputSchema,
} from "./schemas";

/**
 * Events tRPC router
 * Handles all event-related operations with proper authentication and validation
 */
export const eventsRouter = createTRPCRouter({
  /**
   * Get all events for the authenticated user with optional filtering
   */
  getAll: protectedProcedure
    .input(GetAllEventsInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getAllEvents(ctx.userId, input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch events",
          cause: error,
        });
      }
    }),

  /**
   * Get a specific event by ID
   */
  getById: protectedProcedure
    .input(GetEventByIdInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        const event = await getEventById(ctx.userId, input);

        if (!event) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found",
          });
        }

        return event;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch event",
          cause: error,
        });
      }
    }),

  /**
   * Create a new event
   */
  create: protectedProcedure
    .input(CreateEventInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createEvent(ctx.userId, input);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Calendar feed not found")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message:
                "Calendar feed not found or you don't have permission to access it",
              cause: error,
            });
          }
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create event",
          cause: error,
        });
      }
    }),

  /**
   * Update an existing event
   */
  update: protectedProcedure
    .input(UpdateEventInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { eventId, data } = input;
        return await updateEvent(ctx.userId, eventId, data);
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message.includes("Event not found") ||
            error.message.includes("permission")
          ) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message:
                "Event not found or you don't have permission to update it",
              cause: error,
            });
          }
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update event",
          cause: error,
        });
      }
    }),

  /**
   * Delete an event
   */
  delete: protectedProcedure
    .input(DeleteEventInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteEvent(ctx.userId, input);
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message.includes("Event not found") ||
            error.message.includes("permission")
          ) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message:
                "Event not found or you don't have permission to delete it",
              cause: error,
            });
          }
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete event",
          cause: error,
        });
      }
    }),
});
