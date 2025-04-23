import { newDate } from "@/lib/date-utils";

import { Priority, TaskStatus } from "@/types/task";

import { FieldMapper } from "../field-mapper";
import { FieldMapping } from "../types";

/**
 * OutlookFieldMapper
 *
 * Handles field mappings between our internal task model and Outlook's task model.
 */
export class OutlookFieldMapper extends FieldMapper {
  constructor() {
    // Define Outlook-specific field mappings
    const outlookMappings: FieldMapping[] = [
      {
        internalField: "status",
        externalField: "status",
        preserveLocalValue: false,
        transformToExternal: (value: unknown) => {
          const status = value as TaskStatus | null | undefined;
          if (!status) return "notStarted";
          switch (status) {
            case TaskStatus.TODO:
              return "notStarted";
            case TaskStatus.IN_PROGRESS:
              return "inProgress";
            case TaskStatus.COMPLETED:
              return "completed";
            default:
              return "notStarted";
          }
        },
        transformToInternal: (value: unknown) => {
          const status = value as string | null | undefined;
          if (!status) return TaskStatus.TODO;
          switch (status.toLowerCase()) {
            case "notstarted":
              return TaskStatus.TODO;
            case "inprogress":
              return TaskStatus.IN_PROGRESS;
            case "completed":
              return TaskStatus.COMPLETED;
            case "waitingonothers":
              return TaskStatus.TODO;
            case "deferred":
              return TaskStatus.TODO;
            default:
              return TaskStatus.TODO;
          }
        },
      },
      {
        internalField: "priority",
        externalField: "priority",
        preserveLocalValue: true,
        transformToExternal: (value: unknown) => {
          const priority = value as Priority | null | undefined;
          if (!priority) return "normal";
          switch (priority) {
            case Priority.HIGH:
              return "high";
            case Priority.MEDIUM:
              return "normal";
            case Priority.LOW:
              return "low";
            case Priority.NONE:
              return "normal";
            default:
              return "normal";
          }
        },
        transformToInternal: (value: unknown) => {
          const priority = value as string | null | undefined;
          if (!priority) return Priority.MEDIUM;
          switch (priority.toLowerCase()) {
            case "high":
              return Priority.HIGH;
            case "normal":
              return Priority.MEDIUM;
            case "low":
              return Priority.LOW;
            default:
              return Priority.MEDIUM;
          }
        },
      },
      // Outlook-specific date handling
      {
        internalField: "dueDate",
        externalField: "dueDate",
        preserveLocalValue: true,
        transformToExternal: (value: unknown) => {
          if (!value) return null;
          // Ensure dates are in UTC for consistency
          return new Date(
            new Date(value as string | number | Date).toISOString()
          );
        },
        transformToInternal: (value: unknown) => {
          if (!value) return null;
          // Use date-utils to ensure proper date creation
          return newDate(value as string | number | Date);
        },
      },
      {
        internalField: "completedAt",
        externalField: "completedDate",
        preserveLocalValue: true,
        transformToExternal: (value: unknown) => {
          if (!value) return null;
          return new Date(
            new Date(value as string | number | Date).toISOString()
          );
        },
        transformToInternal: (value: unknown) => {
          if (!value) return null;
          return newDate(value as string | number | Date);
        },
      },
    ];

    // Call parent constructor with Outlook-specific mappings
    super(outlookMappings);
  }
}
