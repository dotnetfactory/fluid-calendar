import { z } from "zod";

/**
 * tRPC input schemas for project procedures
 * These are used for validating client input to tRPC procedures
 */

// Project status enum
export const ProjectStatusSchema = z.enum(["active", "archived"]);

export const GetAllProjectsInputSchema = z
  .object({
    status: z.array(ProjectStatusSchema).optional(),
    search: z.string().optional(),
  })
  .optional();

export const GetProjectByIdInputSchema = z.object({
  id: z.string().uuid("Invalid project ID"),
  includeTasks: z.boolean().default(false),
});

export const CreateProjectInputSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  status: ProjectStatusSchema.default("active"),
});

export const UpdateProjectInputSchema = z.object({
  id: z.string().uuid("Invalid project ID"),
  name: z.string().min(1, "Name is required").trim().optional(),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  status: ProjectStatusSchema.optional(),
});

export const DeleteProjectInputSchema = z.object({
  id: z.string().uuid("Invalid project ID"),
});

// Export types
export type GetAllProjectsInput = z.infer<typeof GetAllProjectsInputSchema>;
export type GetProjectByIdInput = z.infer<typeof GetProjectByIdInputSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>;
export type DeleteProjectInput = z.infer<typeof DeleteProjectInputSchema>;
