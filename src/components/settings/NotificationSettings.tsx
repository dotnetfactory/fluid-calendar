import { useSettingsStore } from "@/store/settings";

import { SettingRow, SettingsSection } from "./SettingsSection";

export function NotificationSettings() {
  const { notifications, updateNotificationSettings } = useSettingsStore();

  return (
    <SettingsSection
      title="Notification Settings"
      description="Configure your notification preferences."
    >
      <SettingRow
        label="Daily Email Updates"
        description="Receive a daily email with your upcoming meetings and tasks"
      >
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={notifications.dailyEmailEnabled}
              onChange={(e) =>
                updateNotificationSettings({
                  dailyEmailEnabled: e.target.checked,
                })
              }
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm">Enable daily email updates</span>
          </label>
        </div>
      </SettingRow>

      <div className="mt-4 text-sm text-muted-foreground">
        More notification settings coming soon! You&apos;ll be able to customize
        event reminders, updates, and more.
      </div>
    </SettingsSection>
  );
}
