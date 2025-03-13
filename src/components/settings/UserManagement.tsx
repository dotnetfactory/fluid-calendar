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
import AccessDeniedMessage from "@/components/auth/AccessDeniedMessage";

/**
 * User management settings component
 * Allows admins to manage user accounts and public signup settings
 */
export function UserManagement() {
  return (
    <AdminOnly
      fallback={
        <AccessDeniedMessage message="You do not have permission to access the user management settings." />
      }
    >
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
