import { z } from "zod";

// Project status enum
export const ProjectStatusSchema = z.enum(["active", "archived"]);

/**
 * Input schema for creating a project in the API layer
 * Only include fields that can be set by the user
 */
export const CreateProjectInputSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  status: ProjectStatusSchema.default("active"),
});

/**
 * Input schema for updating a project in the API layer
 * Only include fields that can be updated by the user
 */
export const UpdateProjectInputSchema = z.object({
  name: z.string().min(1, "Name is required").trim().optional(),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  status: ProjectStatusSchema.optional(),
});

/**
 * Input schema for getting a project by ID
 */
export const GetProjectByIdInputSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  includeTasks: z.boolean().default(false),
});

/**
 * Input schema for getting all projects for a user
 */
export const GetAllProjectsInputSchema = z.object({
  status: z.array(ProjectStatusSchema).optional(),
  search: z.string().optional(),
});

// Export types
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>;
export type GetProjectByIdInput = z.infer<typeof GetProjectByIdInputSchema>;
export type GetAllProjectsInput = z.infer<typeof GetAllProjectsInputSchema>;
