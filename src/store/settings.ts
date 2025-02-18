import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Settings } from "@/types/settings";

interface ConnectedAccount {
  id: string;
  provider: "GOOGLE" | "OUTLOOK";
  email: string;
  calendars: Array<{ id: string; name: string }>;
}

interface SettingsStore extends Settings {
  accounts: ConnectedAccount[];
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
    workHourEnd: 17, // 5 PM
    selectedCalendars: "[]",
    bufferMinutes: 15,
    highEnergyStart: 9, // 9 AM
    highEnergyEnd: 12, // 12 PM
    mediumEnergyStart: 13, // 1 PM
    mediumEnergyEnd: 15, // 3 PM
    lowEnergyStart: 15, // 3 PM
    lowEnergyEnd: 17, // 5 PM
    groupByProject: false,
  },
  system: {
    googleClientId: undefined,
    googleClientSecret: undefined,
    outlookClientId: undefined,
    outlookClientSecret: undefined,
    outlookTenantId: undefined,
    logLevel: "none",
  },
  accounts: [],
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      updateUserSettings: (settings) =>
        set((state) => ({
          user: { ...state.user, ...settings },
        })),
      updateCalendarSettings: (settings) =>
        set((state) => ({
          calendar: { ...state.calendar, ...settings },
        })),
      updateNotificationSettings: (settings) =>
        set((state) => ({
          notifications: { ...state.notifications, ...settings },
        })),
      updateIntegrationSettings: (settings) =>
        set((state) => ({
          integrations: { ...state.integrations, ...settings },
        })),
      updateDataSettings: (settings) =>
        set((state) => ({
          data: { ...state.data, ...settings },
        })),
      updateAutoScheduleSettings: (settings) =>
        set((state) => ({
          autoSchedule: { ...state.autoSchedule, ...settings },
        })),
      updateSystemSettings: (settings) =>
        set((state) => ({
          system: { ...state.system, ...settings },
        })),
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
          console.error("Failed to remove account:", error);
          throw error;
        }
      },
      refreshAccounts: async () => {
        try {
          const response = await fetch("/api/accounts");
          const accounts = await response.json();
          set({ accounts });
        } catch (error) {
          console.error("Failed to refresh accounts:", error);
          throw error;
        }
      },
    }),
    {
      name: "calendar-settings",
    }
  )
);
