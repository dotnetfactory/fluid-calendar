"use client";

import AccessDeniedMessage from "@/components/auth/AccessDeniedMessage";
import AdminOnly from "@/components/auth/AdminOnly";

import PublicSignupSettings from "./PublicSignupSettings";
import { SettingsSection } from "./SettingsSection";
import { UserTable } from "./UserTable";

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
          <UserTable />
        </div>
      </SettingsSection>
    </AdminOnly>
  );
}
