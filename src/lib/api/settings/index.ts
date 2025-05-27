import {
  AutoScheduleSettings,
  CalendarSettings,
  DataSettings,
  IntegrationSettings,
  NotificationSettings,
  UserSettings,
} from "@prisma/client";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import {
  type AutoScheduleSettingsInput,
  type CalendarSettingsInput,
  type DataSettingsInput,
  type GetSettingsInput,
  GetSettingsInputSchema,
  type IntegrationSettingsInput,
  type NotificationSettingsInput,
  type UpdateSettingsInput,
  UpdateSettingsInputSchema,
  type UserSettingsInput,
} from "./schemas";

const LOG_SOURCE = "SettingsAPI";

// Union type for all settings
type AllSettings =
  | UserSettings
  | NotificationSettings
  | CalendarSettings
  | AutoScheduleSettings
  | DataSettings
  | IntegrationSettings;

// Transformation functions for array-to-JSON conversions
function transformNotificationSettingsForDB(input: NotificationSettingsInput) {
  const { defaultReminderTiming, ...rest } = input;
  return {
    ...rest,
    ...(defaultReminderTiming && {
      defaultReminderTiming: JSON.stringify(defaultReminderTiming),
    }),
  };
}

function transformCalendarSettingsForDB(input: CalendarSettingsInput) {
  const { workingHoursDays, ...rest } = input;
  return {
    ...rest,
    ...(workingHoursDays && {
      workingHoursDays: JSON.stringify(workingHoursDays),
    }),
  };
}

function transformAutoScheduleSettingsForDB(input: AutoScheduleSettingsInput) {
  const { workDays, selectedCalendars, ...rest } = input;
  return {
    ...rest,
    ...(workDays && {
      workDays: JSON.stringify(workDays),
    }),
    ...(selectedCalendars && {
      selectedCalendars: JSON.stringify(selectedCalendars),
    }),
  };
}

/**
 * Get settings by type for a user
 */
export async function getSettings(
  userId: string,
  input: GetSettingsInput
): Promise<AllSettings> {
  const { type } = GetSettingsInputSchema.parse(input);

  logger.info("Getting settings", { userId, type }, LOG_SOURCE);

  switch (type) {
    case "user":
      return await getUserSettings(userId);
    case "notification":
      return await getNotificationSettings(userId);
    case "calendar":
      return await getCalendarSettings(userId);
    case "autoSchedule":
      return await getAutoScheduleSettings(userId);
    case "data":
      return await getDataSettings(userId);
    case "integration":
      return await getIntegrationSettings(userId);
    default:
      throw new Error(`Unknown settings type: ${type}`);
  }
}

/**
 * Update settings by type for a user
 */
export async function updateSettings(
  userId: string,
  input: UpdateSettingsInput
): Promise<AllSettings> {
  const { type, data } = UpdateSettingsInputSchema.parse(input);

  logger.info("Updating settings", { userId, type }, LOG_SOURCE);

  switch (type) {
    case "user":
      return await updateUserSettings(userId, data as UserSettingsInput);
    case "notification":
      return await updateNotificationSettings(
        userId,
        data as NotificationSettingsInput
      );
    case "calendar":
      return await updateCalendarSettings(
        userId,
        data as CalendarSettingsInput
      );
    case "autoSchedule":
      return await updateAutoScheduleSettings(
        userId,
        data as AutoScheduleSettingsInput
      );
    case "data":
      return await updateDataSettings(userId, data as DataSettingsInput);
    case "integration":
      return await updateIntegrationSettings(
        userId,
        data as IntegrationSettingsInput
      );
    default:
      throw new Error(`Unknown settings type: ${type}`);
  }
}

/**
 * Get user settings with defaults
 */
async function getUserSettings(userId: string): Promise<UserSettings> {
  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  logger.info("Retrieved user settings", { userId }, LOG_SOURCE);
  return settings;
}

/**
 * Update user settings
 */
async function updateUserSettings(
  userId: string,
  updates: UserSettingsInput
): Promise<UserSettings> {
  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: updates,
    create: {
      userId,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...updates,
    },
  });

  logger.info("Updated user settings", { userId }, LOG_SOURCE);
  return settings;
}

/**
 * Get notification settings with defaults
 */
async function getNotificationSettings(
  userId: string
): Promise<NotificationSettings> {
  const settings = await prisma.notificationSettings.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      emailNotifications: true,
      dailyEmailEnabled: true,
      eventInvites: true,
      eventUpdates: true,
      eventCancellations: true,
      eventReminders: true,
      defaultReminderTiming: "[30]",
    },
  });

  logger.info("Retrieved notification settings", { userId }, LOG_SOURCE);
  return settings;
}

/**
 * Update notification settings
 */
async function updateNotificationSettings(
  userId: string,
  updates: NotificationSettingsInput
): Promise<NotificationSettings> {
  const dbUpdates = transformNotificationSettingsForDB(updates);

  const settings = await prisma.notificationSettings.upsert({
    where: { userId },
    update: dbUpdates,
    create: {
      userId,
      emailNotifications: true,
      dailyEmailEnabled: true,
      eventInvites: true,
      eventUpdates: true,
      eventCancellations: true,
      eventReminders: true,
      defaultReminderTiming: "[30]",
      ...dbUpdates,
    },
  });

  logger.info("Updated notification settings", { userId }, LOG_SOURCE);
  return settings;
}

/**
 * Get calendar settings with defaults
 */
async function getCalendarSettings(userId: string): Promise<CalendarSettings> {
  const settings = await prisma.calendarSettings.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      workingHoursEnabled: true,
      workingHoursStart: "09:00",
      workingHoursEnd: "17:00",
      workingHoursDays: "[1,2,3,4,5]",
      defaultDuration: 60,
      defaultColor: "#3b82f6",
      defaultReminder: 30,
      refreshInterval: 5,
    },
  });

  logger.info("Retrieved calendar settings", { userId }, LOG_SOURCE);
  return settings;
}

/**
 * Update calendar settings
 */
async function updateCalendarSettings(
  userId: string,
  updates: CalendarSettingsInput
): Promise<CalendarSettings> {
  const dbUpdates = transformCalendarSettingsForDB(updates);

  const settings = await prisma.calendarSettings.upsert({
    where: { userId },
    update: dbUpdates,
    create: {
      userId,
      workingHoursEnabled: true,
      workingHoursStart: "09:00",
      workingHoursEnd: "17:00",
      workingHoursDays: "[1,2,3,4,5]",
      defaultDuration: 60,
      defaultColor: "#3b82f6",
      defaultReminder: 30,
      refreshInterval: 5,
      ...dbUpdates,
    },
  });

  logger.info("Updated calendar settings", { userId }, LOG_SOURCE);
  return settings;
}

/**
 * Get auto-schedule settings with defaults
 */
async function getAutoScheduleSettings(
  userId: string
): Promise<AutoScheduleSettings> {
  const settings = await prisma.autoScheduleSettings.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      workDays: "[1,2,3,4,5]",
      workHourStart: 9,
      workHourEnd: 17,
      selectedCalendars: "[]",
      bufferMinutes: 15,
      groupByProject: false,
    },
  });

  logger.info("Retrieved auto-schedule settings", { userId }, LOG_SOURCE);
  return settings;
}

/**
 * Update auto-schedule settings
 */
async function updateAutoScheduleSettings(
  userId: string,
  updates: AutoScheduleSettingsInput
): Promise<AutoScheduleSettings> {
  const dbUpdates = transformAutoScheduleSettingsForDB(updates);

  const settings = await prisma.autoScheduleSettings.upsert({
    where: { userId },
    update: dbUpdates,
    create: {
      userId,
      workDays: "[1,2,3,4,5]",
      workHourStart: 9,
      workHourEnd: 17,
      selectedCalendars: "[]",
      bufferMinutes: 15,
      groupByProject: false,
      ...dbUpdates,
    },
  });

  logger.info("Updated auto-schedule settings", { userId }, LOG_SOURCE);
  return settings;
}

/**
 * Get data settings with defaults
 */
async function getDataSettings(userId: string): Promise<DataSettings> {
  const settings = await prisma.dataSettings.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      autoBackup: true,
      backupInterval: 7,
      retainDataFor: 365,
    },
  });

  logger.info("Retrieved data settings", { userId }, LOG_SOURCE);
  return settings;
}

/**
 * Update data settings
 */
async function updateDataSettings(
  userId: string,
  updates: DataSettingsInput
): Promise<DataSettings> {
  const settings = await prisma.dataSettings.upsert({
    where: { userId },
    update: updates,
    create: {
      userId,
      autoBackup: true,
      backupInterval: 7,
      retainDataFor: 365,
      ...updates,
    },
  });

  logger.info("Updated data settings", { userId }, LOG_SOURCE);
  return settings;
}

/**
 * Get integration settings with defaults
 */
async function getIntegrationSettings(
  userId: string
): Promise<IntegrationSettings> {
  const settings = await prisma.integrationSettings.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      googleCalendarEnabled: true,
      googleCalendarAutoSync: true,
      googleCalendarInterval: 5,
      outlookCalendarEnabled: true,
      outlookCalendarAutoSync: true,
      outlookCalendarInterval: 5,
    },
  });

  logger.info("Retrieved integration settings", { userId }, LOG_SOURCE);
  return settings;
}

/**
 * Update integration settings
 */
async function updateIntegrationSettings(
  userId: string,
  updates: IntegrationSettingsInput
): Promise<IntegrationSettings> {
  const settings = await prisma.integrationSettings.upsert({
    where: { userId },
    update: updates,
    create: {
      userId,
      googleCalendarEnabled: true,
      googleCalendarAutoSync: true,
      googleCalendarInterval: 5,
      outlookCalendarEnabled: true,
      outlookCalendarAutoSync: true,
      outlookCalendarInterval: 5,
      ...updates,
    },
  });

  logger.info("Updated integration settings", { userId }, LOG_SOURCE);
  return settings;
}
