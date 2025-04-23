import { useSettingsStore } from "@/store/settings";

import { SettingRow, SettingsSection } from "./SettingsSection";

export function DataSettings() {
  const { data, updateDataSettings } = useSettingsStore();

  return (
    <SettingsSection
      title="Data Settings"
      description="Manage your calendar data and backup preferences."
    >
      <SettingRow
        label="Automatic Backup"
        description="Regularly backup your calendar data"
      >
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={data.autoBackup}
              onChange={(e) =>
                updateDataSettings({
                  autoBackup: e.target.checked,
                })
              }
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm">Enable automatic backups</span>
          </label>

          {data.autoBackup && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Backup Interval (days)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={data.backupInterval}
                onChange={(e) =>
                  updateDataSettings({
                    backupInterval: Number(e.target.value),
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          )}
        </div>
      </SettingRow>

      <SettingRow
        label="Data Retention"
        description="Configure how long to keep your calendar data"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Retain data for (days)
          </label>
          <input
            type="number"
            min="30"
            max="3650"
            value={data.retainDataFor}
            onChange={(e) =>
              updateDataSettings({
                retainDataFor: Number(e.target.value),
              })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          <p className="mt-1 text-sm text-gray-500">
            Events older than this will be automatically archived
          </p>
        </div>
      </SettingRow>

      <SettingRow label="Export Data" description="Download your calendar data">
        <div className="space-y-3">
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Export as iCal
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Export as JSON
          </button>
        </div>
      </SettingRow>

      <SettingRow label="Clear Data" description="Remove all calendar data">
        <button
          type="button"
          className="inline-flex items-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          onClick={() => {
            if (
              window.confirm(
                "Are you sure you want to clear all calendar data? This action cannot be undone."
              )
            ) {
              // TODO: Implement clear data functionality
            }
          }}
        >
          Clear All Data
        </button>
      </SettingRow>
    </SettingsSection>
  );
}
