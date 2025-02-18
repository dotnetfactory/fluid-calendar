import { useSettingsStore } from "@/store/settings";
import { SettingsSection, SettingRow } from "./SettingsSection";
import { useEffect } from "react";

export function SystemSettings() {
  const { system, updateSystemSettings } = useSettingsStore();

  useEffect(() => {
    // Load settings from API
    fetch("/api/system-settings")
      .then((res) => res.json())
      .then((data) => {
        updateSystemSettings({
          googleClientId: data.googleClientId,
          googleClientSecret: data.googleClientSecret,
          outlookClientId: data.outlookClientId,
          outlookClientSecret: data.outlookClientSecret,
          outlookTenantId: data.outlookTenantId,
          logLevel: data.logLevel,
        });
      })
      .catch(console.error);
  }, [updateSystemSettings]);

  const handleUpdate = async (updates: Partial<typeof system>) => {
    try {
      const response = await fetch("/api/system-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      updateSystemSettings(data);
    } catch (error) {
      console.error("Failed to update system settings:", error);
    }
  };

  return (
    <SettingsSection
      title="System Settings"
      description="Configure system-wide settings for the application."
    >
      <SettingRow
        label="Google Calendar Integration"
        description={
          <div className="space-y-2">
            <div>
              Configure Google OAuth credentials for calendar integration.
            </div>
            <div>
              To get these credentials:
              <ol className="list-decimal ml-4 mt-1">
                <li>
                  Go to the{" "}
                  <a
                    href="https://console.cloud.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Google Cloud Console
                  </a>
                </li>
                <li>Create a new project or select an existing one</li>
                <li>Enable the Google Calendar API</li>
                <li>Go to Credentials</li>
                <li>Create OAuth 2.0 Client ID credentials</li>
                <li>
                  Add authorized redirect URI: {window.location.origin}
                  /api/auth/callback/google
                </li>
                <li>Copy the Client ID and Client Secret</li>
              </ol>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Google Client ID
            </label>
            <input
              type="text"
              value={system.googleClientId || ""}
              onChange={(e) => handleUpdate({ googleClientId: e.target.value })}
              placeholder="your-client-id.apps.googleusercontent.com"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Google Client Secret
            </label>
            <input
              type="password"
              value={system.googleClientSecret || ""}
              onChange={(e) =>
                handleUpdate({ googleClientSecret: e.target.value })
              }
              placeholder="Enter your client secret"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </SettingRow>

      <SettingRow
        label="Outlook Calendar Integration"
        description={
          <div className="space-y-2">
            <div>
              Configure Microsoft Azure AD credentials for Outlook calendar
              integration.
            </div>
            <div>
              To get these credentials:
              <ol className="list-decimal ml-4 mt-1">
                <li>
                  Go to the{" "}
                  <a
                    href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Azure Portal
                  </a>
                </li>
                <li>Register a new application or select an existing one</li>
                <li>Add Microsoft Graph Calendar permissions</li>
                <li>Go to Authentication</li>
                <li>Add platform and configure OAuth settings</li>
                <li>
                  Add redirect URI: {window.location.origin}
                  /api/auth/callback/azure-ad
                </li>
                <li>
                  Copy the Application (client) ID and create a client secret
                </li>
              </ol>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Outlook Client ID
            </label>
            <input
              type="text"
              value={system.outlookClientId || ""}
              onChange={(e) =>
                handleUpdate({ outlookClientId: e.target.value })
              }
              placeholder="your-client-id"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Outlook Client Secret
            </label>
            <input
              type="password"
              value={system.outlookClientSecret || ""}
              onChange={(e) =>
                handleUpdate({ outlookClientSecret: e.target.value })
              }
              placeholder="Enter your client secret"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tenant ID (Optional)
            </label>
            <input
              type="text"
              value={system.outlookTenantId || ""}
              onChange={(e) =>
                handleUpdate({ outlookTenantId: e.target.value })
              }
              placeholder="common"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-sm text-gray-500">
              Leave empty to allow any Microsoft account (recommended)
            </p>
          </div>
        </div>
      </SettingRow>

      <SettingRow
        label="Logging"
        description="Configure application logging level"
      >
        <select
          value={system.logLevel || "none"}
          onChange={(e) =>
            handleUpdate({ logLevel: e.target.value as "none" | "debug" })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="none">None</option>
          <option value="debug">Debug</option>
        </select>
      </SettingRow>
    </SettingsSection>
  );
}
