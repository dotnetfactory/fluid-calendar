import { z } from "zod";

/**
 * Settings type enum for different settings categories
 */
export const SettingsTypeSchema = z.enum([
  "user",
  "notification",
  "calendar",
  "autoSchedule",
  "data",
  "integration",
]);

/**
 * Input schema for user settings
 */
export const UserSettingsInputSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  defaultView: z.enum(["day", "week", "month", "agenda"]).optional(),
  timeZone: z.string().optional(),
  weekStartDay: z.enum(["monday", "sunday"]).optional(),
  timeFormat: z.enum(["12h", "24h"]).optional(),
});

/**
 * Input schema for notification settings
 */
export const NotificationSettingsInputSchema = z.object({
  emailNotifications: z.boolean().optional(),
  dailyEmailEnabled: z.boolean().optional(),
  eventInvites: z.boolean().optional(),
  eventUpdates: z.boolean().optional(),
  eventCancellations: z.boolean().optional(),
  eventReminders: z.boolean().optional(),
  defaultReminderTiming: z.array(z.number()).optional(),
});

/**
 * Input schema for calendar settings
 */
export const CalendarSettingsInputSchema = z.object({
  defaultCalendarId: z.string().uuid().nullable().optional(),
  workingHoursEnabled: z.boolean().optional(),
  workingHoursStart: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(), // HH:mm format
  workingHoursEnd: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(), // HH:mm format
  workingHoursDays: z.array(z.number().min(0).max(6)).optional(),
  defaultDuration: z.number().min(1).optional(),
  defaultColor: z.string().optional(),
  defaultReminder: z.number().min(0).optional(),
  refreshInterval: z.number().min(1).optional(),
});

/**
 * Input schema for auto-schedule settings
 */
export const AutoScheduleSettingsInputSchema = z.object({
  workDays: z.array(z.number().min(0).max(6)).optional(),
  workHourStart: z.number().min(0).max(23).optional(),
  workHourEnd: z.number().min(0).max(23).optional(),
  selectedCalendars: z.array(z.string().uuid()).optional(),
  bufferMinutes: z.number().min(0).optional(),
  highEnergyStart: z.number().min(0).max(23).nullable().optional(),
  highEnergyEnd: z.number().min(0).max(23).nullable().optional(),
  mediumEnergyStart: z.number().min(0).max(23).nullable().optional(),
  mediumEnergyEnd: z.number().min(0).max(23).nullable().optional(),
  lowEnergyStart: z.number().min(0).max(23).nullable().optional(),
  lowEnergyEnd: z.number().min(0).max(23).nullable().optional(),
  groupByProject: z.boolean().optional(),
});

/**
 * Input schema for data settings
 */
export const DataSettingsInputSchema = z.object({
  autoBackup: z.boolean().optional(),
  backupInterval: z.number().min(1).optional(),
  retainDataFor: z.number().min(1).optional(),
});

/**
 * Input schema for integration settings
 */
export const IntegrationSettingsInputSchema = z.object({
  googleCalendarEnabled: z.boolean().optional(),
  googleCalendarAutoSync: z.boolean().optional(),
  googleCalendarInterval: z.number().min(1).optional(),
  outlookCalendarEnabled: z.boolean().optional(),
  outlookCalendarAutoSync: z.boolean().optional(),
  outlookCalendarInterval: z.number().min(1).optional(),
});

/**
 * Input schema for getting settings by type
 */
export const GetSettingsInputSchema = z.object({
  type: SettingsTypeSchema,
});

/**
 * Input schema for updating settings
 */
export const UpdateSettingsInputSchema = z.object({
  type: SettingsTypeSchema,
  data: z.union([
    UserSettingsInputSchema,
    NotificationSettingsInputSchema,
    CalendarSettingsInputSchema,
    AutoScheduleSettingsInputSchema,
    DataSettingsInputSchema,
    IntegrationSettingsInputSchema,
  ]),
});

// Export types
export type SettingsType = z.infer<typeof SettingsTypeSchema>;
export type UserSettingsInput = z.infer<typeof UserSettingsInputSchema>;
export type NotificationSettingsInput = z.infer<
  typeof NotificationSettingsInputSchema
>;
export type CalendarSettingsInput = z.infer<typeof CalendarSettingsInputSchema>;
export type AutoScheduleSettingsInput = z.infer<
  typeof AutoScheduleSettingsInputSchema
>;
export type DataSettingsInput = z.infer<typeof DataSettingsInputSchema>;
export type IntegrationSettingsInput = z.infer<
  typeof IntegrationSettingsInputSchema
>;
export type GetSettingsInput = z.infer<typeof GetSettingsInputSchema>;
export type UpdateSettingsInput = z.infer<typeof UpdateSettingsInputSchema>;
