import { newDate } from "@/lib/date-utils";

import { TaskStatus } from "@/types/task";

import { FieldMapper } from "../field-mapper";
import { FieldMapping } from "../types";

/**
 * GoogleFieldMapper
 *
 * Handles field mappings between our internal task model and Google Tasks.
 */
type GoogleTaskRaw = {
  notes?: string;
  due?: string | number | Date;
  completed?: string | number | Date;
};

export class GoogleFieldMapper extends FieldMapper {
  constructor() {
    const googleMappings: FieldMapping[] = [
      {
        internalField: "status",
        externalField: "status",
        preserveLocalValue: false,
        transformToExternal: (value: unknown) => {
          const status = value as TaskStatus | null | undefined;
          if (!status) return "needsAction";
          switch (status) {
            case TaskStatus.COMPLETED:
              return "completed";
            default:
              return "needsAction";
          }
        },
        transformToInternal: (value: unknown) => {
          const status = value as string | null | undefined;
          if (!status) return TaskStatus.TODO;
          switch ((status || "").toLowerCase()) {
            case "completed":
              return TaskStatus.COMPLETED;
            default:
              return TaskStatus.TODO;
          }
        },
      },
      // Google Tasks uses `notes` for description. Use `description` as the canonical external field
      // and read `notes` from the provider payload inside transformToInternal. Keep
      {
        internalField: "description",
        externalField: "description",
        preserveLocalValue: true,
        transformToInternal: (_value: unknown, source) => {
          const s = source as unknown as GoogleTaskRaw;
          return s.notes ?? null;
        },
      },
      {
        internalField: "dueDate",
        externalField: "dueDate",
        preserveLocalValue: true,
        transformToExternal: (value: unknown) => {
          if (!value) return null;
          return new Date(new Date(value as string | number | Date).toISOString());
        },
        transformToInternal: (_value: unknown, source) => {
          const s = source as unknown as GoogleTaskRaw;
          return s.due ? newDate(s.due) : null;
        },
      },
      {
        internalField: "completedAt",
        externalField: "completedDate",
        preserveLocalValue: true,
        transformToExternal: (value: unknown) => {
          if (!value) return null;
          return new Date(new Date(value as string | number | Date).toISOString());
        },
        transformToInternal: (_value: unknown, source) => {
          const s = source as unknown as GoogleTaskRaw;
          return s.completed ? newDate(s.completed) : null;
        },
      },
      // Priority isn't present in Google Tasks; preserve the local priority
      {
        internalField: "priority",
        externalField: "priority",
        preserveLocalValue: true,
      },
    ];

    super(googleMappings);
  }
}
