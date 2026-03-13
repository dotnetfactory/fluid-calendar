import { newDate } from "@/lib/date-utils";

import { Task, TaskStatus } from "@/types/task";

import {
  ExternalTask,
  TaskToCreate,
  TaskUpdates,
} from "./providers/task-provider.interface";
import { FieldMapping, FieldMappingDirection, TaskWithSync } from "./types";

/**
 * FieldMapper
 *
 * Utility to map fields between internal and external task representations.
 * Providers can extend this with their specific field mappings.
 */
export class FieldMapper {
  /**
   * Default field mappings that apply to most providers
   */
  protected defaultFieldMappings: FieldMapping[] = [
    {
      internalField: "title",
      externalField: "title",
      preserveLocalValue: false, // Title should always be updated
    },
    {
      internalField: "description",
      externalField: "description",
      preserveLocalValue: true,
    },
    {
      internalField: "status",
      externalField: "status",
      preserveLocalValue: false,
      transformToExternal: (value) => {
        if (!value) return "todo";
        return value;
      },
      transformToInternal: (value) => {
        if (!value) return TaskStatus.TODO;
        return value as TaskStatus;
      },
    },
    {
      internalField: "dueDate",
      externalField: "dueDate",
      preserveLocalValue: true,
      transformToExternal: (value: unknown) => {
        if (!value) return null;
        // Safe type assertion as we know dueDate in Task is a Date
        return new Date(value as string | number | Date);
      },
      transformToInternal: (value: unknown) => {
        if (!value) return null;
        // Safe type assertion as we expect a date-like value from external sources
        return newDate(value as string | number | Date);
      },
    },
    {
      internalField: "startDate",
      externalField: "startDate",
      preserveLocalValue: true,
      transformToExternal: (value: unknown) => {
        if (!value) return null;
        // Safe type assertion as we know startDate in Task is a Date
        return new Date(value as string | number | Date);
      },
      transformToInternal: (value: unknown) => {
        if (!value) return null;
        // Safe type assertion as we expect a date-like value from external sources
        return newDate(value as string | number | Date);
      },
    },
    {
      internalField: "priority",
      externalField: "priority",
      preserveLocalValue: true,
    },
    {
      internalField: "isRecurring",
      externalField: "isRecurring",
      preserveLocalValue: true,
    },
    {
      internalField: "recurrenceRule",
      externalField: "recurrenceRule",
      preserveLocalValue: true,
    },
  ];

  /**
   * Provider-specific field mappings that override or extend defaults
   */
  protected providerFieldMappings: FieldMapping[] = [];

  /**
   * Combined field mappings (defaults + provider-specific)
   */
  protected fieldMappings: FieldMapping[] = [];

  constructor(providerMappings: FieldMapping[] = []) {
    this.providerFieldMappings = providerMappings;
    this.fieldMappings = [...this.defaultFieldMappings, ...providerMappings];
  }

  /**
   * Map fields from internal task to external format
   *
   * @param task Internal task
   * @returns External task format
   */
  mapToExternalTask(task: Partial<Task>): TaskToCreate {
    const externalTask: TaskToCreate = {
      title: task.title || "Untitled Task",
    };

    // Apply all mappings in TO_EXTERNAL direction
    // Use unknown as an intermediate type to avoid type errors
    this.applyMappings(
      task as unknown as Record<string, unknown>,
      externalTask as unknown as Record<string, unknown>,
      "TO_EXTERNAL"
    );

    return externalTask;
  }

  /**
   * Map fields from external task to internal format
   *
   * @param externalTask External task
   * @param projectId Project ID to associate with
   * @returns Internal task format
   */
  mapToInternalTask(
    externalTask: ExternalTask,
    projectId: string
  ): Partial<Task> {
    const internalTask: Partial<Task> = {
      projectId,
    };

    // Apply all mappings in TO_INTERNAL direction
    this.applyMappings(
      externalTask as unknown as Record<string, unknown>,
      internalTask as Record<string, unknown>,
      "TO_INTERNAL"
    );

    return internalTask;
  }

  /**
   * Map fields for update operations
   *
   * @param task Internal task
   * @returns External update format
   */
  mapToExternalTaskUpdates(task: Partial<Task>): TaskUpdates {
    // For updates we can reuse the same mapping logic
    return this.mapToExternalTask(task) as TaskUpdates;
  }

  /**
   * Apply mappings in the specified direction
   *
   * @param source Source object
   * @param target Target object
   * @param direction Mapping direction
   */
  private applyMappings(
    source: Record<string, unknown>,
    target: Record<string, unknown>,
    direction: FieldMappingDirection
  ): void {
    const isToExternal = direction === "TO_EXTERNAL";

    this.fieldMappings.forEach((mapping) => {
      const sourceField = isToExternal
        ? mapping.internalField
        : mapping.externalField;
      const targetField = isToExternal
        ? mapping.externalField
        : mapping.internalField;
      const transform = isToExternal
        ? mapping.transformToExternal
        : mapping.transformToInternal;

      // Get the source value
      const sourceValue = source[sourceField as string];

      // Skip if undefined and we want to preserve local values
      if (sourceValue === undefined && mapping.preserveLocalValue !== false) {
        return;
      }

      // Apply transformation if provided
      let targetValue;
      if (transform) {
        // Create a casting function to safely handle the transformations
        // This is a workaround for TypeScript's static type checking
        function castForTransform(source: Record<string, unknown>) {
          // Use type assertion to satisfy TypeScript, even though at runtime the objects
          // will be used as is with the properties they have
          return source as unknown as Partial<Task> & ExternalTask;
        }

        targetValue = transform(sourceValue, castForTransform(source));
      } else {
        targetValue = sourceValue;
      }

      // Set the target value
      target[targetField as string] = targetValue;
    });
  }

  /**
   * Get a field mapping by internal field name
   *
   * @param internalField Internal field name
   * @returns Field mapping or undefined
   */
  getFieldMapping(internalField: keyof Task): FieldMapping | undefined {
    return this.fieldMappings.find((m) => m.internalField === internalField);
  }

  /**
   * Merge task fields, respecting preserveLocalValue settings
   *
   * @param localTask The local task
   * @param incomingTaskData New task data (usually from external system)
   * @returns Merged task data
   */
  mergeTaskData(
    localTask: TaskWithSync,
    incomingTaskData: Partial<Task>
  ): Partial<Task> {
    const result: Partial<Task> = { ...localTask };

    // For each field in the incoming data
    Object.entries(incomingTaskData).forEach(([key, value]) => {
      const fieldName = key as keyof Task;
      const mapping = this.getFieldMapping(fieldName);

      // If no mapping exists or preserveLocalValue is false, or value is not null/undefined,
      // update the field
      if (
        !mapping ||
        mapping.preserveLocalValue === false ||
        (value !== null && value !== undefined)
      ) {
        // Need to cast to compatible type
        (result as Record<string, unknown>)[fieldName] = value;
      }
    });

    return result;
  }
}
