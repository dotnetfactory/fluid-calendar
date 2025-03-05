import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Settings } from "@/types/settings";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "SettingsStore";

interface ConnectedAccount {
  id: string;
  provider: "GOOGLE" | "OUTLOOK";
  email: string;
  calendars: Array<{ id: string; name: string }>;
}

interface SettingsStore extends Settings {
  accounts: ConnectedAccount[];
  initialized: boolean;

  // Actions
  initializeSettings: () => Promise<void>;
  updateUserSettings: (settings: Partial<Settings["user"]>) => void;
  updateCalendarSettings: (settings: Partial<Settings["calendar"]>) => void;
  updateNotificationSettings: (
    settings: Partial<Settings["notifications"]>
  ) => void;
  updateIntegrationSettings: (
    settings: Partial<Settings["integrations"]>
  ) => void;
  updateDataSettings: (settings: Partial<Settings["data"]>) => void;
  updateAutoScheduleSettings: (
    settings: Partial<Settings["autoSchedule"]>
  ) => void;
  updateSystemSettings: (settings: Partial<Settings["system"]>) => void;
  setAccounts: (accounts: ConnectedAccount[]) => void;
  removeAccount: (accountId: string) => Promise<void>;
  refreshAccounts: () => Promise<void>;
}

const defaultSettings: Settings & { accounts: ConnectedAccount[] } = {
  user: {
    theme: "system",
    defaultView: "week",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    weekStartDay: "sunday",
    timeFormat: "12h",
  },
  calendar: {
    workingHours: {
      enabled: true,
      start: "09:00",
      end: "17:00",
      days: [1, 2, 3, 4, 5], // Monday to Friday
    },
    eventDefaults: {
      defaultDuration: 60,
      defaultColor: "#3b82f6",
      defaultReminder: 30,
    },
    refreshInterval: 5,
  },
  notifications: {
    emailNotifications: true,
    notifyFor: {
      eventInvites: true,
      eventUpdates: true,
      eventCancellations: true,
      eventReminders: true,
    },
    defaultReminderTiming: [30], // 30 minutes before
  },
  integrations: {
    googleCalendar: {
      enabled: true,
      autoSync: true,
      syncInterval: 5,
    },
    outlookCalendar: {
      enabled: true,
      autoSync: true,
      syncInterval: 5,
    },
  },
  data: {
    autoBackup: true,
    backupInterval: 7,
    retainDataFor: 365,
  },
  autoSchedule: {
    workDays: JSON.stringify([1, 2, 3, 4, 5]), // Monday to Friday
    workHourStart: 9, // 9 AM
    workHourEnd: 20, // 8 PM
    selectedCalendars: "[]",
    bufferMinutes: 15,
    highEnergyStart: 9, // 9 AM
    highEnergyEnd: 12, // 12 PM
    mediumEnergyStart: 13, // 1 PM
    mediumEnergyEnd: 15, // 3 PM
    lowEnergyStart: 15, // 3 PM
    lowEnergyEnd: 20, // 8 PM
    groupByProject: false,
  },
  system: {
    googleClientId: undefined,
    googleClientSecret: undefined,
    outlookClientId: undefined,
    outlookClientSecret: undefined,
    outlookTenantId: undefined,
    logLevel: "none",
    logRetention: undefined,
    logDestination: "db",
  },
  accounts: [],
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      initialized: false,
      updateUserSettings: (settings) =>
        set((state) => {
          // Update local state
          const newSettings = { ...state.user, ...settings };

          // Save to database
          fetch("/api/user-settings", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(newSettings),
          }).catch((error) => {
            logger.error(
              "Failed to save user settings to database",
              {
                error: error instanceof Error ? error.message : "Unknown error",
              },
              LOG_SOURCE
            );
          });

          return { user: newSettings };
        }),
      updateCalendarSettings: (settings) =>
        set((state) => {
          // Update local state
          const newSettings = { ...state.calendar, ...settings };

          // Save to database
          fetch("/api/calendar-settings", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              defaultCalendarId: newSettings.defaultCalendarId,
              workingHoursEnabled: newSettings.workingHours.enabled,
              workingHoursStart: newSettings.workingHours.start,
              workingHoursEnd: newSettings.workingHours.end,
              workingHoursDays: JSON.stringify(newSettings.workingHours.days),
              defaultDuration: newSettings.eventDefaults.defaultDuration,
              defaultColor: newSettings.eventDefaults.defaultColor,
              defaultReminder: newSettings.eventDefaults.defaultReminder,
              refreshInterval: newSettings.refreshInterval,
            }),
          }).catch((error) => {
            logger.error(
              "Failed to save calendar settings to database",
              {
                error: error instanceof Error ? error.message : "Unknown error",
              },
              LOG_SOURCE
            );
          });

          return { calendar: newSettings };
        }),
      updateNotificationSettings: (settings) =>
        set((state) => {
          // Update local state
          const newSettings = { ...state.notifications, ...settings };

          // Save to database
          fetch("/api/notification-settings", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              emailNotifications: newSettings.emailNotifications,
              eventInvites: newSettings.notifyFor.eventInvites,
              eventUpdates: newSettings.notifyFor.eventUpdates,
              eventCancellations: newSettings.notifyFor.eventCancellations,
              eventReminders: newSettings.notifyFor.eventReminders,
              defaultReminderTiming: JSON.stringify(
                newSettings.defaultReminderTiming
              ),
            }),
          }).catch((error) => {
            logger.error(
              "Failed to save notification settings to database",
              {
                error: error instanceof Error ? error.message : "Unknown error",
              },
              LOG_SOURCE
            );
          });

          return { notifications: newSettings };
        }),
      updateIntegrationSettings: (settings) =>
        set((state) => {
          // Update local state
          const newSettings = { ...state.integrations, ...settings };

          // Save to database
          fetch("/api/integration-settings", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              googleCalendarEnabled: newSettings.googleCalendar.enabled,
              googleCalendarAutoSync: newSettings.googleCalendar.autoSync,
              googleCalendarInterval: newSettings.googleCalendar.syncInterval,
              outlookCalendarEnabled: newSettings.outlookCalendar.enabled,
              outlookCalendarAutoSync: newSettings.outlookCalendar.autoSync,
              outlookCalendarInterval: newSettings.outlookCalendar.syncInterval,
            }),
          }).catch((error) => {
            logger.error(
              "Failed to save integration settings to database",
              {
                error: error instanceof Error ? error.message : "Unknown error",
              },
              LOG_SOURCE
            );
          });

          return { integrations: newSettings };
        }),
      updateDataSettings: (settings) =>
        set((state) => {
          // Update local state
          const newSettings = { ...state.data, ...settings };

          // Save to database
          fetch("/api/data-settings", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(newSettings),
          }).catch((error) => {
            logger.error(
              "Failed to save data settings to database",
              {
                error: error instanceof Error ? error.message : "Unknown error",
              },
              LOG_SOURCE
            );
          });

          return { data: newSettings };
        }),
      updateAutoScheduleSettings: (settings) =>
        set((state) => {
          // Update local state
          const newSettings = { ...state.autoSchedule, ...settings };

          // Save to database
          fetch("/api/auto-schedule-settings", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(newSettings),
          }).catch((error) => {
            logger.error(
              "Failed to save auto schedule settings to database",
              {
                error: error instanceof Error ? error.message : "Unknown error",
              },
              LOG_SOURCE
            );
          });

          return { autoSchedule: newSettings };
        }),
      updateSystemSettings: (settings) =>
        set((state) => {
          // Update local state
          const newSettings = { ...state.system, ...settings };

          // Save to database
          fetch("/api/system-settings", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(newSettings),
          }).catch((error) => {
            logger.error(
              "Failed to save system settings to database",
              {
                error: error instanceof Error ? error.message : "Unknown error",
              },
              LOG_SOURCE
            );
          });

          return { system: newSettings };
        }),
      setAccounts: (accounts) =>
        set(() => ({
          accounts,
        })),
      removeAccount: async (accountId) => {
        try {
          await fetch("/api/accounts", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ accountId }),
          });

          // Refresh accounts after removal
          await get().refreshAccounts();
        } catch (error) {
          logger.error(
            "Failed to remove account",
            {
              error: error instanceof Error ? error.message : "Unknown error",
              accountId,
            },
            LOG_SOURCE
          );
          throw error;
        }
      },
      refreshAccounts: async () => {
        try {
          const response = await fetch("/api/accounts");
          const accounts = await response.json();
          set({ accounts });
        } catch (error) {
          logger.error(
            "Failed to refresh accounts",
            { error: error instanceof Error ? error.message : "Unknown error" },
            LOG_SOURCE
          );
          throw error;
        }
      },
      initializeSettings: async () => {
        try {
          // Load all settings from the database
          const [
            userSettings,
            calendarSettings,
            notificationSettings,
            integrationSettings,
            dataSettings,
            autoScheduleSettings,
            systemSettings,
            accounts,
          ] = await Promise.all([
            fetch("/api/user-settings").then((res) => res.json()),
            fetch("/api/calendar-settings").then((res) => res.json()),
            fetch("/api/notification-settings").then((res) => res.json()),
            fetch("/api/integration-settings").then((res) => res.json()),
            fetch("/api/data-settings").then((res) => res.json()),
            fetch("/api/auto-schedule-settings").then((res) => res.json()),
            fetch("/api/system-settings").then((res) => res.json()),
            fetch("/api/accounts").then((res) => res.json()),
          ]);

          // Set initialized flag
          set({ initialized: true, accounts });

          // Update all settings
          get().updateUserSettings({
            theme: userSettings.theme,
            defaultView: userSettings.defaultView,
            timeZone: userSettings.timeZone,
            weekStartDay: userSettings.weekStartDay,
            timeFormat: userSettings.timeFormat,
          });

          // More updates will be added here
          get().updateCalendarSettings({
            defaultCalendarId: calendarSettings.defaultCalendarId,
            workingHours: {
              enabled: calendarSettings.workingHoursEnabled,
              start: calendarSettings.workingHoursStart,
              end: calendarSettings.workingHoursEnd,
              days: JSON.parse(calendarSettings.workingHoursDays),
            },
            eventDefaults: {
              defaultDuration: calendarSettings.defaultDuration,
              defaultColor: calendarSettings.defaultColor,
              defaultReminder: calendarSettings.defaultReminder,
            },
            refreshInterval: calendarSettings.refreshInterval,
          });

          get().updateNotificationSettings({
            emailNotifications: notificationSettings.emailNotifications,
            notifyFor: {
              eventInvites: notificationSettings.eventInvites,
              eventUpdates: notificationSettings.eventUpdates,
              eventCancellations: notificationSettings.eventCancellations,
              eventReminders: notificationSettings.eventReminders,
            },
            defaultReminderTiming: JSON.parse(
              notificationSettings.defaultReminderTiming
            ),
          });

          get().updateIntegrationSettings({
            googleCalendar: {
              enabled: integrationSettings.googleCalendarEnabled,
              autoSync: integrationSettings.googleCalendarAutoSync,
              syncInterval: integrationSettings.googleCalendarInterval,
            },
            outlookCalendar: {
              enabled: integrationSettings.outlookCalendarEnabled,
              autoSync: integrationSettings.outlookCalendarAutoSync,
              syncInterval: integrationSettings.outlookCalendarInterval,
            },
          });

          get().updateDataSettings({
            autoBackup: dataSettings.autoBackup,
            backupInterval: dataSettings.backupInterval,
            retainDataFor: dataSettings.retainDataFor,
          });

          get().updateAutoScheduleSettings({
            workDays: autoScheduleSettings.workDays,
            workHourStart: autoScheduleSettings.workHourStart,
            workHourEnd: autoScheduleSettings.workHourEnd,
            selectedCalendars: autoScheduleSettings.selectedCalendars,
            bufferMinutes: autoScheduleSettings.bufferMinutes,
            highEnergyStart: autoScheduleSettings.highEnergyStart,
            highEnergyEnd: autoScheduleSettings.highEnergyEnd,
            mediumEnergyStart: autoScheduleSettings.mediumEnergyStart,
            mediumEnergyEnd: autoScheduleSettings.mediumEnergyEnd,
            lowEnergyStart: autoScheduleSettings.lowEnergyStart,
            lowEnergyEnd: autoScheduleSettings.lowEnergyEnd,
            groupByProject: autoScheduleSettings.groupByProject,
          });

          get().updateSystemSettings({
            googleClientId: systemSettings.googleClientId,
            googleClientSecret: systemSettings.googleClientSecret,
            outlookClientId: systemSettings.outlookClientId,
            outlookClientSecret: systemSettings.outlookClientSecret,
            outlookTenantId: systemSettings.outlookTenantId,
            logLevel: systemSettings.logLevel as "none" | "debug",
            logRetention: systemSettings.logRetention,
            logDestination: systemSettings.logDestination,
          });
        } catch (error) {
          logger.error(
            "Failed to initialize settings from database",
            { error: error instanceof Error ? error.message : "Unknown error" },
            LOG_SOURCE
          );
        }
      },
    }),
    {
      name: "calendar-settings",
    }
  )
);
