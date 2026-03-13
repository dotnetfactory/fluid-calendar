export type TimeFormat = "12h" | "24h";
export type WeekStartDay = "monday" | "sunday";
export type ThemeMode = "light" | "dark" | "system";
export type CalendarView = "day" | "week" | "month" | "agenda";

export interface UserSettings {
  theme: ThemeMode;
  defaultView: CalendarView;
  timeZone: string;
  weekStartDay: WeekStartDay;
  timeFormat: TimeFormat;
}

export interface CalendarSettings {
  defaultCalendarId?: string;
  workingHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string; // HH:mm format
    days: number[]; // 0-6, where 0 is Sunday
  };
  eventDefaults: {
    defaultDuration: number; // minutes
    defaultColor: string;
    defaultReminder: number; // minutes before event
  };
  refreshInterval: number; // minutes
}

export interface NotificationSettings {
  emailNotifications: boolean;
  dailyEmailEnabled: boolean; // Controls whether the user receives daily email updates
  notifyFor: {
    eventInvites: boolean;
    eventUpdates: boolean;
    eventCancellations: boolean;
    eventReminders: boolean;
  };
  defaultReminderTiming: number[]; // minutes before event, multiple allowed
}

export interface IntegrationSettings {
  googleCalendar: {
    enabled: boolean;
    autoSync: boolean;
    syncInterval: number; // minutes
  };
  outlookCalendar: {
    enabled: boolean;
    autoSync: boolean;
    syncInterval: number; // minutes
  };
}

export interface DataSettings {
  autoBackup: boolean;
  backupInterval: number; // days
  retainDataFor: number; // days
}

export interface AutoScheduleSettings {
  workDays: string; // JSON string of numbers 0-6
  workHourStart: number; // 0-23
  workHourEnd: number; // 0-23
  selectedCalendars: string; // JSON string of calendar IDs
  bufferMinutes: number;
  highEnergyStart: number | null;
  highEnergyEnd: number | null;
  mediumEnergyStart: number | null;
  mediumEnergyEnd: number | null;
  lowEnergyStart: number | null;
  lowEnergyEnd: number | null;
  groupByProject: boolean;
}

export interface SystemSettings {
  googleClientId?: string;
  googleClientSecret?: string;
  outlookClientId?: string;
  outlookClientSecret?: string;
  outlookTenantId?: string;
  disableHomepage?: boolean; // Whether to disable the homepage and redirect to login/calendar
  publicSignup?: boolean; // Whether public signup is enabled
  resendApiKey?: string; // API key for Resend email service
}

export interface Settings {
  user: UserSettings;
  calendar: CalendarSettings;
  notifications: NotificationSettings;
  integrations: IntegrationSettings;
  data: DataSettings;
  autoSchedule: AutoScheduleSettings;
  system: SystemSettings;
}
