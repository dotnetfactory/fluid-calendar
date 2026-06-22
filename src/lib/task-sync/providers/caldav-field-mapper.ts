import { Priority, TaskStatus } from "@/types/task";

import { FieldMapper } from "../field-mapper";
import { FieldMapping } from "../types";

/**
 * Maps a VTODO `STATUS` string to a FluidCalendar `TaskStatus`. `COMPLETED`
 * maps to completed, `IN-PROCESS` to in-progress, everything else
 * (`NEEDS-ACTION`, `CANCELLED`, absent) to todo.
 */
function vtodoStatusToInternal(value: unknown): TaskStatus {
  switch (String(value ?? "").toUpperCase()) {
    case "COMPLETED":
      return TaskStatus.COMPLETED;
    case "IN-PROCESS":
      return TaskStatus.IN_PROGRESS;
    default:
      return TaskStatus.TODO;
  }
}

/**
 * Maps a VTODO `PRIORITY` (0-9, where 1 is highest and 0 means "undefined" per
 * RFC 5545) into FluidCalendar's high/medium/low buckets.
 */
function vtodoPriorityToInternal(value: unknown): Priority {
  if (value === null || value === undefined) return Priority.NONE;
  const n = parseInt(String(value), 10);
  if (isNaN(n) || n === 0) return Priority.NONE;
  if (n <= 4) return Priority.HIGH;
  if (n === 5) return Priority.MEDIUM;
  return Priority.LOW;
}

/**
 * CalDAVFieldMapper
 *
 * Field mappings between our internal task model and CalDAV `VTODO` items
 * (GitHub issue #144). Only `status` and `priority` need CalDAV-specific
 * translation; the remaining fields (title, description, due/start dates,
 * recurrence) already align with the base mapper's external field names.
 */
export class CalDAVFieldMapper extends FieldMapper {
  constructor() {
    const caldavMappings: FieldMapping[] = [
      {
        internalField: "status",
        externalField: "status",
        preserveLocalValue: false, // Status is external-owned for imported tasks.
        transformToInternal: vtodoStatusToInternal,
        transformToExternal: (value: unknown) => {
          // Write-back is unsupported, but provide a sane VTODO STATUS.
          return value === TaskStatus.COMPLETED ? "COMPLETED" : "NEEDS-ACTION";
        },
      },
      {
        internalField: "priority",
        externalField: "priority",
        // Override the base mapper's preserve-local default so the VTODO
        // priority is applied on import.
        preserveLocalValue: false,
        transformToInternal: vtodoPriorityToInternal,
      },
      {
        internalField: "completedAt",
        externalField: "completedDate",
        preserveLocalValue: true,
      },
    ];

    super(caldavMappings);
  }
}
