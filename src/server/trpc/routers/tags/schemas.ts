import { z } from "zod";

/**
 * tRPC input schemas for tag procedures
 * These are used for validating client input to tRPC procedures
 */

export const GetAllTagsInputSchema = z
  .object({
    // No additional filters for now, but can be extended
  })
  .optional();

export const GetTagByIdInputSchema = z.object({
  id: z.string().uuid("Invalid tag ID"),
});

export const CreateTagInputSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  color: z.string().nullable().optional(),
});

export const UpdateTagInputSchema = z.object({
  id: z.string().uuid("Invalid tag ID"),
  name: z.string().min(1, "Name is required").trim().optional(),
  color: z.string().nullable().optional(),
});

export const DeleteTagInputSchema = z.object({
  id: z.string().uuid("Invalid tag ID"),
});

// Export types
export type GetAllTagsInput = z.infer<typeof GetAllTagsInputSchema>;
export type GetTagByIdInput = z.infer<typeof GetTagByIdInputSchema>;
export type CreateTagInput = z.infer<typeof CreateTagInputSchema>;
export type UpdateTagInput = z.infer<typeof UpdateTagInputSchema>;
export type DeleteTagInput = z.infer<typeof DeleteTagInputSchema>;
