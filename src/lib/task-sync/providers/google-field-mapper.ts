import { newDate } from "@/lib/date-utils";

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
      // The provider already normalizes notes/due to description/dueDate,
      // so the default mappings handle those fields.
      {
        internalField: "completedAt",
        externalField: "completedDate",
        preserveLocalValue: false, // Reopening a Google task clears completion locally.
        transformToExternal: (value: unknown) => {
          if (!value) return null;
          return newDate(value as string | number | Date);
        },
        transformToInternal: (value: unknown) => {
          if (!value) return null;
          return newDate(value as string | number | Date);
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
