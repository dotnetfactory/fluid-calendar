import { z } from "zod";

// Task status, energy level, and time preference enums for tRPC input validation
export const TaskStatusSchema = z.enum([
  "TODO",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);
export const EnergyLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const TimePreferenceSchema = z.enum([
  "MORNING",
  "AFTERNOON",
  "EVENING",
  "ANYTIME",
]);

/**
 * Input schema for creating a task via tRPC
 */
export const CreateTaskInputSchema = z.object({
  title: z.string().min(1, "Title is required").trim(),
  description: z.string().nullable().optional(),
  status: TaskStatusSchema.default("TODO"),
  dueDate: z
    .string()
    .datetime()
    .transform((val) => new Date(val))
    .nullable()
    .optional(),
  startDate: z
    .string()
    .datetime()
    .transform((val) => new Date(val))
    .nullable()
    .optional(),
  duration: z.number().positive().nullable().optional(),
  priority: z.string().nullable().optional(),
  energyLevel: EnergyLevelSchema.nullable().optional(),
  preferredTime: TimePreferenceSchema.nullable().optional(),
  isAutoScheduled: z.boolean().default(false),
  scheduleLocked: z.boolean().default(false),
  scheduledStart: z
    .string()
    .datetime()
    .transform((val) => new Date(val))
    .nullable()
    .optional(),
  scheduledEnd: z
    .string()
    .datetime()
    .transform((val) => new Date(val))
    .nullable()
    .optional(),
  postponedUntil: z
    .string()
    .datetime()
    .transform((val) => new Date(val))
    .nullable()
    .optional(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

/**
 * Input schema for updating a task via tRPC
 */
export const UpdateTaskInputSchema = z.object({
  taskId: z.string().uuid("Invalid task ID"),
  data: CreateTaskInputSchema.partial().extend({
    completedAt: z
      .string()
      .datetime()
      .transform((val) => new Date(val))
      .nullable()
      .optional(),
  }),
});

/**
 * Input schema for getting a task by ID via tRPC
 */
export const GetTaskByIdInputSchema = z.object({
  taskId: z.string().uuid("Invalid task ID"),
  includeTags: z.boolean().default(true),
  includeProject: z.boolean().default(true),
});

/**
 * Input schema for getting all tasks via tRPC with filters
 */
export const GetAllTasksInputSchema = z.object({
  status: z.array(TaskStatusSchema).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  energyLevel: z.array(EnergyLevelSchema).optional(),
  timePreference: z.array(TimePreferenceSchema).optional(),
  search: z.string().optional(),
  startDate: z
    .string()
    .datetime()
    .transform((val) => new Date(val))
    .optional(),
  endDate: z
    .string()
    .datetime()
    .transform((val) => new Date(val))
    .optional(),
  taskStartDate: z
    .string()
    .datetime()
    .transform((val) => new Date(val))
    .optional(),
  hideUpcomingTasks: z.boolean().default(false),
  projectId: z.string().uuid().optional(),
});

/**
 * Input schema for deleting a task via tRPC
 */
export const DeleteTaskInputSchema = z.object({
  taskId: z.string().uuid("Invalid task ID"),
});

/**
 * Input schema for normalizing recurrence rules via tRPC
 */
export const NormalizeRecurrenceInputSchema = z.object({
  recurrenceRule: z.string().min(1, "Recurrence rule is required"),
});

/**
 * Input schema for scheduling all tasks via tRPC
 */
export const ScheduleAllTasksInputSchema = z.object({
  forceReschedule: z.boolean().default(false),
});

// Export types
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;
export type GetTaskByIdInput = z.infer<typeof GetTaskByIdInputSchema>;
export type GetAllTasksInput = z.infer<typeof GetAllTasksInputSchema>;
export type DeleteTaskInput = z.infer<typeof DeleteTaskInputSchema>;
export type NormalizeRecurrenceInput = z.infer<
  typeof NormalizeRecurrenceInputSchema
>;
export type ScheduleAllTasksInput = z.infer<typeof ScheduleAllTasksInputSchema>;
