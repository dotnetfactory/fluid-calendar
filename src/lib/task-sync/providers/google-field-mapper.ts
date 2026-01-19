import { TaskStatus } from "@/types/task";

import { FieldMapper } from "../field-mapper";
import { FieldMapping } from "../types";

/**
 * GoogleFieldMapper
 *
 * Handles field mappings between our internal task model and Google Tasks.
 */

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
        externalField: "notes",
//        preserveLocalValue: true,
      },
      {
        internalField: "dueDate",
        externalField: "due",
        preserveLocalValue: true,
        transformToExternal: (value: unknown) => {
          if (!value) return null;
          return new Date(new Date(value as string | number | Date).toISOString());
        },
        transformToInternal: (value: unknown) => {
          if (!value) return null;
          return new Date(new Date(value as string | number | Date).toISOString());
        },
      },
      {
        internalField: "completedAt",
        externalField: "completed",
        preserveLocalValue: true,
        transformToExternal: (value: unknown) => {
          if (!value) return null;
          return new Date(new Date(value as string | number | Date).toISOString());
        },
        transformToInternal: (value: unknown) => {
          if (!value) return null;
          return new Date(new Date(value as string | number | Date).toISOString());
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
