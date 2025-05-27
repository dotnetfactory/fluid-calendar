import { z } from "zod";

/**
 * Input schema for creating an event via tRPC
 */
export const CreateEventInputSchema = z.object({
  feedId: z.string().uuid("Invalid feed ID"),
  title: z.string().min(1, "Title is required").trim(),
  description: z.string().nullable().optional(),
  start: z
    .string()
    .datetime()
    .transform((val) => new Date(val)),
  end: z
    .string()
    .datetime()
    .transform((val) => new Date(val)),
  location: z.string().nullable().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().nullable().optional(),
  allDay: z.boolean().default(false),
});

/**
 * Input schema for updating an event via tRPC
 */
export const UpdateEventInputSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  data: CreateEventInputSchema.partial(),
});

/**
 * Input schema for getting an event by ID via tRPC
 */
export const GetEventByIdInputSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  includeFeed: z.boolean().default(true),
});

/**
 * Input schema for getting all events via tRPC with filters
 */
export const GetAllEventsInputSchema = z.object({
  feedIds: z.array(z.string().uuid()).optional(),
  startDate: z
    .string()
    .datetime()
    .transform((val) => new Date(val))
    .optional(),
  endDate: z
    .string()
    .datetime()
    .transform((val) => new Date(val))
    .optional(),
  search: z.string().optional(),
  isRecurring: z.boolean().optional(),
  allDay: z.boolean().optional(),
});

/**
 * Input schema for deleting an event via tRPC
 */
export const DeleteEventInputSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
});

// Export types
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventInputSchema>;
export type GetEventByIdInput = z.infer<typeof GetEventByIdInputSchema>;
export type GetAllEventsInput = z.infer<typeof GetAllEventsInputSchema>;
export type DeleteEventInput = z.infer<typeof DeleteEventInputSchema>;
