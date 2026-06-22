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
 * (GitHub issue #144).
 *
 * CalDAV import is one-way (incoming only), so the local task must faithfully
 * mirror the VTODO source of truth: an external-owned field that is removed or
 * reset upstream (e.g. a completed task reopened, a due date cleared) must be
 * cleared locally too. The base mapper marks `description`, `dueDate`, and
 * recurrence as preserve-local (so a `null` incoming value is skipped); we
 * override them - and `status`/`priority`/`completedAt` - to `false` so an
 * absent VTODO value clears the local field rather than leaving it stale. Truly
 * local-owned fields (`startDate`, duration, energy level, preferred time) keep
 * the base mapper's preserve-local behavior and are never overwritten on import.
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
        // External-owned: when a VTODO is reopened upstream its COMPLETED
        // property disappears, so the local completion timestamp must clear.
        preserveLocalValue: false,
      },
      {
        internalField: "description",
        externalField: "description",
        // External-owned on import: a cleared VTODO DESCRIPTION clears locally.
        preserveLocalValue: false,
      },
      {
        internalField: "dueDate",
        externalField: "dueDate",
        // External-owned on import: a removed VTODO DUE clears the local due date.
        preserveLocalValue: false,
      },
      {
        internalField: "isRecurring",
        externalField: "isRecurring",
        // External-owned on import: mirrors the VTODO RRULE presence.
        preserveLocalValue: false,
      },
      {
        internalField: "recurrenceRule",
        externalField: "recurrenceRule",
        // External-owned on import: a removed VTODO RRULE clears the local rule.
        preserveLocalValue: false,
      },
    ];

    super(caldavMappings);

    // The base mapper appends provider mappings after its defaults, so a field
    // we override (e.g. dueDate, description, recurrence) ends up with two
    // entries. getFieldMapping() returns the FIRST match, which would be the
    // base default - silently ignoring our preserveLocalValue override during
    // merge. Collapse to one entry per internalField with the provider mapping
    // winning, so both applyMappings() and getFieldMapping() see our overrides.
    const byInternalField = new Map<string, FieldMapping>();
    for (const mapping of this.fieldMappings) {
      byInternalField.set(mapping.internalField, mapping);
    }
    this.fieldMappings = Array.from(byInternalField.values());
  }
}
