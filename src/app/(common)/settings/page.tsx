"use client";

import { useState, useEffect, useMemo } from "react";
import { UserSettings } from "@/components/settings/UserSettings";
import { CalendarSettings } from "@/components/settings/CalendarSettings";
import { AccountManager } from "@/components/settings/AccountManager";
import { AutoScheduleSettings } from "@/components/settings/AutoScheduleSettings";
import { SystemSettings } from "@/components/settings/SystemSettings";
import { OutlookTaskSettings } from "@/components/settings/OutlookTaskSettings";
import { LogViewer } from "@/components/settings/LogViewer";
import { UserManagement } from "@/components/settings/UserManagement";
import { ImportExportSettings } from "@/components/settings/ImportExportSettings";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { useAdmin } from "@/hooks/use-admin";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";

import dynamic from "next/dynamic";
import { isSaasEnabled } from "@/lib/config";

// Add dynamic import for the waitlist page
const WaitlistPage = dynamic(
  () =>
    import(
      `./waitlist/page${
        process.env.NEXT_PUBLIC_ENABLE_SAAS_FEATURES === "true"
          ? ".saas"
          : ".open"
      }`
    ),
  {
    loading: () => <p>Loading...</p>,
  }
);

type SettingsTab =
  | "accounts"
  | "user"
  | "calendar"
  | "auto-schedule"
  | "system"
  | "outlook-tasks"
  | "logs"
  | "user-management"
  | "waitlist"
  | "import-export"
  | "admin-dashboard";

export default function SettingsPage() {
  const [isHydrated, setIsHydrated] = useState(false);
  const { isAdmin, isLoading: isAdminLoading } = useAdmin();

  const tabs = useMemo(() => {
    const baseTabs = [
      { id: "accounts", label: "Accounts" },
      { id: "user", label: "User" },
      { id: "calendar", label: "Calendar" },
      { id: "auto-schedule", label: "Auto-Schedule" },
      { id: "outlook-tasks", label: "Outlook Tasks" },
      { id: "import-export", label: "Import/Export" },
    ] as const;

    // Add admin-only tabs
    if (isAdmin) {
      const adminTabs = [
        { id: "system", label: "System" },
        { id: "logs", label: "Logs" },
        { id: "user-management", label: "Users" },
      ] as const;

      // Only add the waitlist tab if SAAS features are enabled
      if (isSaasEnabled) {
        return [
          ...baseTabs,
          ...adminTabs,
          { id: "waitlist", label: "Beta Waitlist" },
          { id: "admin-dashboard", label: "Admin Dashboard" },
        ] as const;
      }

      return [...baseTabs, ...adminTabs] as const;
    }

    return baseTabs;
  }, [isAdmin]);

  const [activeTab, setActiveTab] = useState<SettingsTab>("accounts");

  // Check initial hash and handle changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) as SettingsTab;

      // Check if the hash is a valid tab ID, regardless of admin status
      const allPossibleTabIds: SettingsTab[] = [
        "accounts",
        "user",
        "calendar",
        "auto-schedule",
        "outlook-tasks",
        "system",
        "logs",
        "user-management",
        "waitlist",
        "import-export",
        "admin-dashboard",
      ];

      if (allPossibleTabIds.includes(hash)) {
        setActiveTab(hash);
      }
    };

    // Handle initial hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []); // Remove tabs dependency since we're now checking against all possible tabs

  // Set hydrated state after mount
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Update hash when tab changes
  useEffect(() => {
    if (isHydrated) {
      window.location.hash = activeTab;
    }
  }, [activeTab, isHydrated]);

  const renderContent = () => {
    // Admin-only tabs
    const adminOnlyTabs = [
      "system",
      "logs",
      "user-management",
      "waitlist",
      "admin-dashboard",
    ];

    // If admin status is still loading and the active tab is admin-only, show loading state
    if (adminOnlyTabs.includes(activeTab) && isAdminLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-muted-foreground">Checking access privileges...</p>
        </div>
      );
    }

    // Check if the active tab is admin-only and the user is not an admin
    if (adminOnlyTabs.includes(activeTab) && !isAdmin) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Admin Access Required</h2>
          <p className="text-muted-foreground">
            You need administrator privileges to access this section.
          </p>
        </div>
      );
    }

    switch (activeTab) {
      case "accounts":
        return <AccountManager />;
      case "user":
        return <UserSettings />;
      case "calendar":
        return <CalendarSettings />;
      case "auto-schedule":
        return <AutoScheduleSettings />;
      case "outlook-tasks":
        return <OutlookTaskSettings />;
      case "system":
        return <SystemSettings />;
      case "logs":
        return <LogViewer />;
      case "user-management":
        return <UserManagement />;
      case "import-export":
        return <ImportExportSettings />;
      case "waitlist":
        return (
          <Suspense fallback={<div>Loading...</div>}>
            <WaitlistPage />
          </Suspense>
        );
      case "admin-dashboard":
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>
            <p className="text-muted-foreground mb-4">
              Access the full admin dashboard to manage the application.
            </p>
            <Button asChild>
              <a href="/admin">Go to Admin Dashboard</a>
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container py-6">
      <div className="flex flex-col lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="lg:w-1/5">
          <Card>
            <nav className="space-y-1 p-1">
              {tabs.map((tab) => (
                <a
                  key={tab.id}
                  href={`#${tab.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab(tab.id as SettingsTab);
                  }}
                  className={cn(
                    "flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    !isHydrated && "duration-0",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {tab.label}
                </a>
              ))}
            </nav>
          </Card>
        </aside>
        <div className="flex-1 mt-6 lg:mt-0">
          <div className="space-y-6">
            <div className={cn("space-y-8", !isHydrated && "opacity-0")}>
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
