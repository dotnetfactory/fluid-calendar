"use client";

import { SettingsSection } from "./SettingsSection";
import PublicSignupSettings from "./PublicSignupSettings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import AdminOnly from "@/components/auth/AdminOnly";

/**
 * User management settings component
 * Allows admins to manage user accounts and public signup settings
 */
export function UserManagement() {
  return (
    <AdminOnly fallback={<AccessDeniedMessage />}>
      <SettingsSection
        title="User Management"
        description="Manage user settings and access control"
      >
        <div className="space-y-6">
          <PublicSignupSettings />

          <Card>
            <CardHeader>
              <CardTitle>User Accounts</CardTitle>
              <CardDescription>
                Manage existing user accounts and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                User account management will be available in a future update.
              </p>
            </CardContent>
          </Card>
        </div>
      </SettingsSection>
    </AdminOnly>
  );
}

/**
 * Message shown when a non-admin user tries to access admin-only settings
 */
function AccessDeniedMessage() {
  return (
    <SettingsSection
      title="User Management"
      description="Manage user settings and access control"
    >
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            You do not have permission to access user management settings. This
            section is only available to administrators.
          </p>
        </CardContent>
      </Card>
    </SettingsSection>
  );
}
