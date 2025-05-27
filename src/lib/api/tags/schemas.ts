import { z } from "zod";

import { TagCreateInputSchema, TagUpdateInputSchema } from "@/lib/generated";

/**
 * Input schema for creating a tag in the API layer
 * Derived from generated schema but excludes userId (provided separately)
 */
export const CreateTagInputSchema = TagCreateInputSchema.omit({
  userId: true,
}).extend({
  name: z.string().min(1, "Name is required").trim(),
  color: z.string().nullable().optional(),
});

/**
 * Input schema for updating a tag in the API layer
 * Excludes userId (provided separately)
 */
export const UpdateTagInputSchema = TagUpdateInputSchema.omit({
  userId: true,
}).extend({
  name: z.string().min(1, "Name is required").trim().optional(),
  color: z.string().nullable().optional(),
});

/**
 * Input schema for getting a tag by ID
 */
export const GetTagByIdInputSchema = z.object({
  tagId: z.string().uuid("Invalid tag ID"),
});

/**
 * Input schema for getting all tags for a user
 */
export const GetAllTagsInputSchema = z.object({
  // No additional filters for now, but can be extended
});

// Export types
export type CreateTagInput = z.infer<typeof CreateTagInputSchema>;
export type UpdateTagInput = z.infer<typeof UpdateTagInputSchema>;
export type GetTagByIdInput = z.infer<typeof GetTagByIdInputSchema>;
export type GetAllTagsInput = z.infer<typeof GetAllTagsInputSchema>;
