import { z } from "zod";

/**
 * Input schema for getting logs via tRPC with filtering and pagination
 */
export const GetLogsInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  level: z.string().optional(),
  source: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  search: z.string().optional(),
});

/**
 * Input schema for deleting logs via tRPC
 */
export const DeleteLogsInputSchema = z.object({
  olderThan: z.number().int().min(1).optional(), // days
  level: z.string().optional(),
});

/**
 * Input schema for batch log entries via tRPC
 */
export const BatchLogEntriesInputSchema = z.object({
  entries: z.array(
    z.object({
      level: z.enum(["debug", "info", "warn", "error"]),
      message: z.string(),
      source: z.string().optional(),
      metadata: z.record(z.any()).optional(),
      timestamp: z.string().datetime().optional(),
    })
  ),
});

/**
 * Input schema for log settings via tRPC
 */
export const LogSettingsInputSchema = z.object({
  logLevel: z.enum(["none", "debug", "info", "warn", "error"]).optional(),
  logDestination: z.enum(["db", "file", "both"]).optional(),
  logRetention: z
    .object({
      error: z.number().int().min(1),
      warn: z.number().int().min(1),
      info: z.number().int().min(1),
      debug: z.number().int().min(1),
    })
    .optional(),
});

// Export types
export type GetLogsInput = z.infer<typeof GetLogsInputSchema>;
export type DeleteLogsInput = z.infer<typeof DeleteLogsInputSchema>;
export type BatchLogEntriesInput = z.infer<typeof BatchLogEntriesInputSchema>;
export type LogSettingsInput = z.infer<typeof LogSettingsInputSchema>;
