import { z } from "zod";

// Task status, energy level, and time preference enums
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
 * Input schema for creating a task in the API layer
 */
export const CreateTaskInputSchema = z.object({
  title: z.string().min(1, "Title is required").trim(),
  description: z.string().nullable().optional(),
  status: TaskStatusSchema.default("TODO"),
  dueDate: z.date().nullable().optional(),
  startDate: z.date().nullable().optional(),
  duration: z.number().positive().nullable().optional(),
  priority: z.string().nullable().optional(),
  energyLevel: EnergyLevelSchema.nullable().optional(),
  preferredTime: TimePreferenceSchema.nullable().optional(),
  isAutoScheduled: z.boolean().default(false),
  scheduleLocked: z.boolean().default(false),
  scheduledStart: z.date().nullable().optional(),
  scheduledEnd: z.date().nullable().optional(),
  postponedUntil: z.date().nullable().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

/**
 * Input schema for updating a task in the API layer
 */
export const UpdateTaskInputSchema = CreateTaskInputSchema.partial().extend({
  completedAt: z.date().nullable().optional(),
});

/**
 * Input schema for getting a task by ID
 */
export const GetTaskByIdInputSchema = z.object({
  taskId: z.string().uuid("Invalid task ID"),
  includeTags: z.boolean().default(true),
  includeProject: z.boolean().default(true),
});

/**
 * Input schema for getting all tasks for a user with filters
 */
export const GetAllTasksInputSchema = z.object({
  status: z.array(TaskStatusSchema).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  energyLevel: z.array(EnergyLevelSchema).optional(),
  timePreference: z.array(TimePreferenceSchema).optional(),
  search: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  taskStartDate: z.date().optional(),
  hideUpcomingTasks: z.boolean().default(false),
  projectId: z.string().uuid().optional(),
});

/**
 * Input schema for normalizing recurrence rules
 */
export const NormalizeRecurrenceInputSchema = z.object({
  recurrenceRule: z.string().min(1, "Recurrence rule is required"),
});

/**
 * Input schema for scheduling all tasks
 */
export const ScheduleAllTasksInputSchema = z.object({
  forceReschedule: z.boolean().default(false),
});

// Export types
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;
export type GetTaskByIdInput = z.infer<typeof GetTaskByIdInputSchema>;
export type GetAllTasksInput = z.infer<typeof GetAllTasksInputSchema>;
export type NormalizeRecurrenceInput = z.infer<
  typeof NormalizeRecurrenceInputSchema
>;
export type ScheduleAllTasksInput = z.infer<typeof ScheduleAllTasksInputSchema>;
