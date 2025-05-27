import { z } from "zod";

/**
 * Input schema for exporting tasks via tRPC
 */
export const ExportTasksInputSchema = z.object({
  includeCompleted: z.boolean().default(false),
});

/**
 * Schema for import tag data via tRPC
 */
export const ImportTagSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable().optional(),
});

/**
 * Schema for import project data via tRPC
 */
export const ImportProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  status: z.string().optional(),
});

/**
 * Schema for import task data via tRPC
 */
export const ImportTaskSchema = z.object({
  title: z.string(),
  description: z.string().nullable().optional(),
  status: z.string(),
  dueDate: z.string().datetime().nullable().optional(),
  duration: z.number().nullable().optional(),
  priority: z.string().nullable().optional(),
  energyLevel: z.string().nullable().optional(),
  preferredTime: z.string().nullable().optional(),
  isAutoScheduled: z.boolean().optional(),
  scheduleLocked: z.boolean().optional(),
  scheduledStart: z.string().datetime().nullable().optional(),
  scheduledEnd: z.string().datetime().nullable().optional(),
  scheduleScore: z.number().nullable().optional(),
  lastScheduled: z.string().datetime().nullable().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.string().nullable().optional(),
  lastCompletedDate: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
  postponedUntil: z.string().datetime().nullable().optional(),
  externalTaskId: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  lastSyncedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  projectId: z.string().nullable().optional(),
  tags: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        color: z.string().nullable().optional(),
      })
    )
    .optional(),
});

/**
 * Input schema for importing tasks via tRPC
 */
export const ImportTasksInputSchema = z.object({
  metadata: z
    .object({
      exportDate: z.string(),
      version: z.string(),
      includeCompleted: z.boolean(),
    })
    .optional(),
  tasks: z.array(ImportTaskSchema),
  tags: z.array(ImportTagSchema).optional(),
  projects: z.array(ImportProjectSchema).optional(),
});

// Export types
export type ExportTasksInput = z.infer<typeof ExportTasksInputSchema>;
export type ImportTasksInput = z.infer<typeof ImportTasksInputSchema>;
