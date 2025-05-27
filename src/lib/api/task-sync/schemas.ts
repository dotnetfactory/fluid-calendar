import { z } from "zod";

/**
 * Schema for creating a new task provider
 */
export const CreateTaskProviderInputSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["OUTLOOK", "GOOGLE", "CALDAV"]),
  accountId: z.string().optional(),
  syncEnabled: z.boolean().default(true),
  defaultProjectId: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
});

/**
 * Schema for updating a task provider
 */
export const UpdateTaskProviderInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  syncEnabled: z.boolean().optional(),
  defaultProjectId: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
});

/**
 * Schema for getting a task provider by ID
 */
export const GetTaskProviderByIdInputSchema = z.object({
  providerId: z.string().min(1),
  includeAccount: z.boolean().default(false),
  includeMappings: z.boolean().default(false),
});

/**
 * Schema for getting all task providers
 */
export const GetAllTaskProvidersInputSchema = z.object({
  includeAccount: z.boolean().default(false),
  includeMappings: z.boolean().default(false),
});

/**
 * Schema for deleting a task provider
 */
export const DeleteTaskProviderInputSchema = z.object({
  providerId: z.string().min(1),
});

/**
 * Schema for creating a new task list mapping
 */
export const CreateTaskMappingInputSchema = z.object({
  providerId: z.string().min(1),
  externalListId: z.string().min(1),
  externalListName: z.string().min(1),
  projectId: z.string().min(1),
  syncEnabled: z.boolean().default(true),
  direction: z
    .enum(["incoming", "outgoing", "bidirectional"])
    .default("incoming"),
});

/**
 * Schema for updating a task list mapping
 */
export const UpdateTaskMappingInputSchema = z.object({
  externalListName: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  syncEnabled: z.boolean().optional(),
  direction: z.enum(["incoming", "outgoing", "bidirectional"]).optional(),
});

/**
 * Schema for getting a task mapping by ID
 */
export const GetTaskMappingByIdInputSchema = z.object({
  mappingId: z.string().min(1),
  includeProvider: z.boolean().default(true),
  includeProject: z.boolean().default(true),
});

/**
 * Schema for getting all task mappings
 */
export const GetAllTaskMappingsInputSchema = z.object({
  providerId: z.string().optional(),
  includeProvider: z.boolean().default(true),
  includeProject: z.boolean().default(true),
});

/**
 * Schema for deleting a task mapping
 */
export const DeleteTaskMappingInputSchema = z.object({
  mappingId: z.string().min(1),
});

/**
 * Schema for getting provider lists
 */
export const GetProviderListsInputSchema = z.object({
  providerId: z.string().min(1),
});

/**
 * Schema for triggering sync
 */
export const TriggerSyncInputSchema = z.object({
  providerId: z.string().optional(),
  mappingId: z.string().optional(),
  forceSync: z.boolean().default(false),
});

// Export types
export type CreateTaskProviderInput = z.infer<
  typeof CreateTaskProviderInputSchema
>;
export type UpdateTaskProviderInput = z.infer<
  typeof UpdateTaskProviderInputSchema
>;
export type GetTaskProviderByIdInput = z.infer<
  typeof GetTaskProviderByIdInputSchema
>;
export type GetAllTaskProvidersInput = z.infer<
  typeof GetAllTaskProvidersInputSchema
>;
export type DeleteTaskProviderInput = z.infer<
  typeof DeleteTaskProviderInputSchema
>;

export type CreateTaskMappingInput = z.infer<
  typeof CreateTaskMappingInputSchema
>;
export type UpdateTaskMappingInput = z.infer<
  typeof UpdateTaskMappingInputSchema
>;
export type GetTaskMappingByIdInput = z.infer<
  typeof GetTaskMappingByIdInputSchema
>;
export type GetAllTaskMappingsInput = z.infer<
  typeof GetAllTaskMappingsInputSchema
>;
export type DeleteTaskMappingInput = z.infer<
  typeof DeleteTaskMappingInputSchema
>;

export type GetProviderListsInput = z.infer<typeof GetProviderListsInputSchema>;
export type TriggerSyncInput = z.infer<typeof TriggerSyncInputSchema>;
