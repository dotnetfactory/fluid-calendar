import { useEffect } from "react";

import AccessDeniedMessage from "@/components/auth/AccessDeniedMessage";
import AdminOnly from "@/components/auth/AdminOnly";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { clearResendInstance } from "@/lib/email/resend";
import { logger } from "@/lib/logger";

import { useSettingsStore } from "@/store/settings";

import { SettingRow, SettingsSection } from "./SettingsSection";

const LOG_SOURCE = "SystemSettings";

/**
 * System settings component
 * Allows admins to configure system-wide settings
 * Only accessible by admin users
 */
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
          disableHomepage: data.disableHomepage,
          resendApiKey: data.resendApiKey,
        });
      })
      .catch((error) => {
        logger.error(
          "Failed to load system settings",
          { error: error instanceof Error ? error.message : "Unknown error" },
          LOG_SOURCE
        );
      });
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

      // Clear Resend instance if the API key was updated
      if ("resendApiKey" in updates) {
        clearResendInstance();
      }
    } catch (error) {
      logger.error(
        "Failed to update system settings",
        { error: error instanceof Error ? error.message : "Unknown error" },
        LOG_SOURCE
      );
    }
  };

  return (
    <AdminOnly
      fallback={
        <AccessDeniedMessage message="You do not have permission to access system settings." />
      }
    >
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
                <ol className="ml-4 mt-1 list-decimal space-y-1 text-muted-foreground">
                  <li>
                    Go to the{" "}
                    <a
                      href="https://console.cloud.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
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
                    /api/calendar/google
                  </li>
                  <li>Copy the Client ID and Client Secret</li>
                </ol>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Google Client ID</Label>
              <Input
                type="text"
                value={system.googleClientId || ""}
                onChange={(e) =>
                  handleUpdate({ googleClientId: e.target.value })
                }
                placeholder="your-client-id.apps.googleusercontent.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Google Client Secret</Label>
              <Input
                type="password"
                value={system.googleClientSecret || ""}
                onChange={(e) =>
                  handleUpdate({ googleClientSecret: e.target.value })
                }
                placeholder="Enter your client secret"
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
                <ol className="ml-4 mt-1 list-decimal space-y-1 text-muted-foreground">
                  <li>
                    Go to the{" "}
                    <a
                      href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
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
            <div className="space-y-2">
              <Label>Outlook Client ID</Label>
              <Input
                type="text"
                value={system.outlookClientId || ""}
                onChange={(e) =>
                  handleUpdate({ outlookClientId: e.target.value })
                }
                placeholder="your-client-id"
              />
            </div>

            <div className="space-y-2">
              <Label>Outlook Client Secret</Label>
              <Input
                type="password"
                value={system.outlookClientSecret || ""}
                onChange={(e) =>
                  handleUpdate({ outlookClientSecret: e.target.value })
                }
                placeholder="Enter your client secret"
              />
            </div>

            <div className="space-y-2">
              <Label>Tenant ID (Optional)</Label>
              <Input
                type="text"
                value={system.outlookTenantId || ""}
                onChange={(e) =>
                  handleUpdate({ outlookTenantId: e.target.value })
                }
                placeholder="common"
              />
              <p className="text-sm text-muted-foreground">
                Leave empty to allow any Microsoft account (recommended)
              </p>
            </div>
          </div>
        </SettingRow>

        <SettingRow label="Homepage" description="Configure homepage behavior">
          <div className="space-y-2">
            <Label>Disable Homepage</Label>
            <Select
              value={system.disableHomepage ? "true" : "false"}
              onValueChange={(value) =>
                handleUpdate({ disableHomepage: value === "true" })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Show Homepage</SelectItem>
                <SelectItem value="true">Redirect to Login/Calendar</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              When enabled, the homepage (/) will redirect to the login page for
              unauthenticated users or to the calendar for authenticated users.
            </p>
          </div>
        </SettingRow>

        <SettingRow
          label="Email Service"
          description="Configure email service settings"
        >
          <div className="space-y-2">
            <Label>Resend API Key</Label>
            <Input
              type="password"
              value={system.resendApiKey || ""}
              onChange={(e) => handleUpdate({ resendApiKey: e.target.value })}
              placeholder="Enter your Resend API key"
            />
            <p className="text-sm text-muted-foreground">
              API key for the Resend email service. Required for sending emails.
            </p>
          </div>
        </SettingRow>
      </SettingsSection>
    </AdminOnly>
  );
}
