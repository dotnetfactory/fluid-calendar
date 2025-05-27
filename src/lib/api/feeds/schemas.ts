import { z } from "zod";

/**
 * Input schema for creating a calendar feed in the API layer
 */
export const CreateFeedInputSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  url: z.string().url("Invalid URL").nullable().optional(),
  type: z.string().min(1, "Type is required"),
  color: z.string().nullable().optional(),
  enabled: z.boolean().default(true),
  accountId: z.string().uuid().nullable().optional(),
  externalCalendarId: z.string().nullable().optional(),
  syncToken: z.string().nullable().optional(),
  ctag: z.string().nullable().optional(),
});

/**
 * Input schema for updating a calendar feed in the API layer
 */
export const UpdateFeedInputSchema = CreateFeedInputSchema.partial();

/**
 * Input schema for getting a feed by ID
 */
export const GetFeedByIdInputSchema = z.object({
  feedId: z.string().uuid("Invalid feed ID"),
  includeEvents: z.boolean().default(false),
  includeAccount: z.boolean().default(true),
});

/**
 * Input schema for getting all feeds for a user with filters
 */
export const GetAllFeedsInputSchema = z.object({
  enabled: z.boolean().optional(),
  type: z.string().optional(),
  accountId: z.string().uuid().optional(),
  includeEvents: z.boolean().default(false),
  includeAccount: z.boolean().default(true),
});

/**
 * Input schema for batch updating feeds
 */
export const BatchUpdateFeedsInputSchema = z.object({
  feeds: z.array(
    z.object({
      id: z.string().uuid("Invalid feed ID"),
      enabled: z.boolean().optional(),
      color: z.string().nullable().optional(),
    })
  ),
});

/**
 * Input schema for deleting a feed
 */
export const DeleteFeedInputSchema = z.object({
  feedId: z.string().uuid("Invalid feed ID"),
});

/**
 * Input schema for syncing feed events
 */
export const SyncFeedEventsInputSchema = z.object({
  feedId: z.string().uuid("Invalid feed ID"),
  events: z.array(
    z
      .object({
        title: z.string(),
        description: z.string().optional(),
        start: z.string().or(z.date()),
        end: z.string().or(z.date()),
        location: z.string().optional(),
        isRecurring: z.boolean().default(false),
        recurrenceRule: z.string().optional(),
        allDay: z.boolean().default(false),
        status: z.string().optional(),
        sequence: z.number().optional(),
        created: z.string().or(z.date()).optional(),
        lastModified: z.string().or(z.date()).optional(),
        externalEventId: z.string().optional(),
        organizer: z.any().optional(),
        attendees: z.any().optional(),
      })
      .passthrough() // Allow additional properties
  ),
});

// Export types
export type CreateFeedInput = z.infer<typeof CreateFeedInputSchema>;
export type UpdateFeedInput = z.infer<typeof UpdateFeedInputSchema>;
export type GetFeedByIdInput = z.infer<typeof GetFeedByIdInputSchema>;
export type GetAllFeedsInput = z.infer<typeof GetAllFeedsInputSchema>;
export type BatchUpdateFeedsInput = z.infer<typeof BatchUpdateFeedsInputSchema>;
export type DeleteFeedInput = z.infer<typeof DeleteFeedInputSchema>;
export type SyncFeedEventsInput = z.infer<typeof SyncFeedEventsInputSchema>;
