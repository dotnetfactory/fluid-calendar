import { Task } from "@/types/task";

import { ExternalTask } from "./providers/task-provider.interface";

/**
 * Field mapping direction
 */
export type FieldMappingDirection = "TO_EXTERNAL" | "TO_INTERNAL";

/**
 * Represents how a field should be mapped between internal and external systems
 */
export interface FieldMapping {
  /**
   * Internal field name in our Task model
   */
  internalField: keyof Task;

  /**
   * External field name in provider's task model
   */
  externalField: keyof ExternalTask;

  /**
   * Optional transformation function for TO_EXTERNAL direction
   */
  transformToExternal?: (value: unknown, task: Partial<Task>) => unknown;

  /**
   * Optional transformation function for TO_INTERNAL direction
   */
  transformToInternal?: (value: unknown, externalTask: ExternalTask) => unknown;

  /**
   * Whether to preserve the local value if external is null/undefined
   * Default is true
   */
  preserveLocalValue?: boolean;
}

/**
 * Result of a synchronization operation
 */
export interface SyncResult {
  mappingId: string;
  providerId: string;
  providerType: string;
  success: boolean;
  imported: number;
  updated: number;
  deleted: number;
  skipped: number;
  direction: "bidirectional";
  errors: { taskId: string; error: string }[];
}

/**
 * Options for conflict resolution
 */
export type ConflictResolution =
  | { strategy: "USE_LOCAL" }
  | { strategy: "USE_REMOTE" }
  | { strategy: "MERGE"; fields: Record<string, "LOCAL" | "REMOTE"> };

/**
 * Represents a task with its synchronization metadata
 */
export interface TaskWithSync extends Task {
  // Sync-specific fields
  externalTaskId?: string | null;
  source?: string | null;
  lastSyncedAt?: Date | null;
  externalListId?: string | null;
  externalCreatedAt?: Date | null;
  externalUpdatedAt?: Date | null;
  syncStatus?: string | null;
  syncError?: string | null;
  syncHash?: string | null;
  skipSync?: boolean;
}

/**
 * Represents a partial task with sync fields - used for mapping
 */
export interface PartialTaskWithSync extends Partial<Task> {
  // Include sync-specific fields that aren't part of the Task interface
  externalTaskId?: string | null;
  source?: string | null;
  lastSyncedAt?: Date | null;
  externalListId?: string | null;
  externalCreatedAt?: Date | null;
  externalUpdatedAt?: Date | null;
  syncStatus?: string | null;
  syncError?: string | null;
  syncHash?: string | null;
  skipSync?: boolean;
}
