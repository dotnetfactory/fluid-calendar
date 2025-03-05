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
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { useAdmin } from "@/hooks/use-admin";

type SettingsTab =
  | "accounts"
  | "user"
  | "calendar"
  | "auto-schedule"
  | "system"
  | "outlook-tasks"
  | "logs"
  | "user-management";

export default function SettingsPage() {
  const [isHydrated, setIsHydrated] = useState(false);
  const { isAdmin } = useAdmin();

  const tabs = useMemo(() => {
    const baseTabs = [
      { id: "accounts", label: "Accounts" },
      { id: "user", label: "User" },
      { id: "calendar", label: "Calendar" },
      { id: "auto-schedule", label: "Auto-Schedule" },
      { id: "outlook-tasks", label: "Outlook Tasks" },
    ] as const;

    // Only add admin tabs if the user is an admin
    const adminTabs = isAdmin
      ? ([
          { id: "system", label: "System" },
          { id: "logs", label: "Logs" },
          { id: "user-management", label: "User Management" },
        ] as const)
      : ([] as const);

    return [...baseTabs, ...adminTabs];
  }, [isAdmin]);

  const [activeTab, setActiveTab] = useState<SettingsTab>("accounts");

  // Check initial hash and handle changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) as SettingsTab;
      if (tabs.some((tab) => tab.id === hash)) {
        setActiveTab(hash);
      }
    };

    // Handle initial hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [tabs]);

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
