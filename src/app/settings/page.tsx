"use client";

import { useState, useEffect, useMemo, useLayoutEffect } from "react";
import { UserSettings } from "@/components/settings/UserSettings";
import { CalendarSettings } from "@/components/settings/CalendarSettings";
import { Separator } from "@/components/ui/separator";
import { AccountManager } from "@/components/settings/AccountManager";
import { AutoScheduleSettings } from "@/components/settings/AutoScheduleSettings";
import { SystemSettings } from "@/components/settings/SystemSettings";
import { OutlookTaskSettings } from "@/components/settings/OutlookTaskSettings";
import { LogViewer } from "@/components/settings/LogViewer";
import { cn } from "@/lib/utils";

type SettingsTab =
  | "accounts"
  | "user"
  | "calendar"
  | "auto-schedule"
  | "system"
  | "outlook-tasks"
  | "logs";

export default function SettingsPage() {
  const [isHydrated, setIsHydrated] = useState(false);
  const tabs = useMemo(
    () =>
      [
        { id: "accounts", label: "Accounts" },
        { id: "user", label: "User" },
        { id: "calendar", label: "Calendar" },
        { id: "auto-schedule", label: "Auto-Schedule" },
        { id: "outlook-tasks", label: "Outlook Tasks" },
        { id: "system", label: "System" },
        { id: "logs", label: "Logs" },
      ] as const,
    []
  );

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
      default:
        return null;
    }
  };

  return (
    <div className="container py-6">
      <div className="flex flex-col lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="lg:w-1/5">
          <nav className="space-y-1 px-4 py-3 bg-white rounded-lg border">
            {tabs.map((tab) => (
              <a
                key={tab.id}
                href={`#${tab.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab(tab.id as SettingsTab);
                }}
                className={cn(
                  "flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium",
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
        </aside>
        <div className="flex-1 mt-6 lg:mt-0">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
              <p className="text-muted-foreground">
                Manage your account settings and preferences.
              </p>
            </div>
            <Separator />
            <div className={cn("space-y-8", !isHydrated && "opacity-0")}>
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
