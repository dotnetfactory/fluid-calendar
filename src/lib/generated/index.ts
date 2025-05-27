// Generated Zod schemas and types
// This file will be replaced by prisma-zod-generator once properly configured
import { z } from "zod";

// Re-export Prisma types
export * from "@prisma/client";

// Basic Zod schemas for core entities (temporary until generator works)
export const UserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  emailVerified: z.date().nullable(),
  image: z.string().nullable(),
  role: z.string().default("user"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  dueDate: z.date().nullable(),
  startDate: z.date().nullable(),
  duration: z.number().nullable(),
  priority: z.string().nullable(),
  energyLevel: z.string().nullable(),
  preferredTime: z.string().nullable(),
  isAutoScheduled: z.boolean().default(false),
  scheduleLocked: z.boolean().default(false),
  scheduledStart: z.date().nullable(),
  scheduledEnd: z.date().nullable(),
  scheduleScore: z.number().nullable(),
  lastScheduled: z.date().nullable(),
  postponedUntil: z.date().nullable(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().nullable(),
  lastCompletedDate: z.date().nullable(),
  completedAt: z.date().nullable(),
  externalTaskId: z.string().nullable(),
  source: z.string().nullable(),
  lastSyncedAt: z.date().nullable(),
  externalListId: z.string().nullable(),
  externalCreatedAt: z.date().nullable(),
  externalUpdatedAt: z.date().nullable(),
  syncStatus: z.string().nullable(),
  syncError: z.string().nullable(),
  syncHash: z.string().nullable(),
  skipSync: z.boolean().default(false),
  userId: z.string().nullable(),
  projectId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string().nullable(),
  status: z.string().default("active"),
  externalId: z.string().nullable(),
  externalSource: z.string().nullable(),
  lastSyncedAt: z.date().nullable(),
  userId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable(),
  userId: z.string().nullable(),
});

export const CalendarFeedSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().nullable(),
  type: z.string(),
  color: z.string().nullable(),
  enabled: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastSync: z.date().nullable(),
  syncToken: z.string().nullable(),
  error: z.string().nullable(),
  channelId: z.string().nullable(),
  resourceId: z.string().nullable(),
  channelExpiration: z.date().nullable(),
  userId: z.string().nullable(),
  accountId: z.string().nullable(),
  caldavPath: z.string().nullable(),
  ctag: z.string().nullable(),
});

export const CalendarEventSchema = z.object({
  id: z.string(),
  feedId: z.string(),
  externalEventId: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  start: z.date(),
  end: z.date(),
  location: z.string().nullable(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().nullable(),
  allDay: z.boolean().default(false),
  status: z.string().nullable(),
  sequence: z.number().nullable(),
  created: z.date().nullable(),
  lastModified: z.date().nullable(),
  organizer: z.any().nullable(),
  attendees: z.any().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  isMaster: z.boolean().default(false),
  masterEventId: z.string().nullable(),
  recurringEventId: z.string().nullable(),
});

// Create input schemas
export const TaskCreateInputSchema = TaskSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const TaskUpdateInputSchema = TaskCreateInputSchema.partial();

export const ProjectCreateInputSchema = ProjectSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const ProjectUpdateInputSchema = ProjectCreateInputSchema.partial();

export const TagCreateInputSchema = TagSchema.omit({ id: true });

export const TagUpdateInputSchema = TagCreateInputSchema.partial();

// Export types
export type User = z.infer<typeof UserSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Tag = z.infer<typeof TagSchema>;
export type CalendarFeed = z.infer<typeof CalendarFeedSchema>;
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

export type TaskCreateInput = z.infer<typeof TaskCreateInputSchema>;
export type TaskUpdateInput = z.infer<typeof TaskUpdateInputSchema>;
export type ProjectCreateInput = z.infer<typeof ProjectCreateInputSchema>;
export type ProjectUpdateInput = z.infer<typeof ProjectUpdateInputSchema>;
export type TagCreateInput = z.infer<typeof TagCreateInputSchema>;
export type TagUpdateInput = z.infer<typeof TagUpdateInputSchema>;
