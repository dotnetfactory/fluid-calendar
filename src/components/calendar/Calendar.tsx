"use client";

import { useCallback, useEffect, useRef } from "react";

import dynamic from "next/dynamic";
import { HiMenu } from "react-icons/hi";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";

import { DayView } from "@/components/calendar/DayView";
import { FeedManager } from "@/components/calendar/FeedManager";
import { MonthView } from "@/components/calendar/MonthView";
import { MultiMonthView } from "@/components/calendar/MultiMonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { addDays, formatDate, newDate, subDays } from "@/lib/date-utils";
import { isSaasEnabled } from "@/lib/config";
import { cn } from "@/lib/utils";

import {
  useCalendarStore,
  useCalendarUIStore,
  useViewStore,
} from "@/store/calendar";
import { useSettingsStore } from "@/store/settings";
import { useTaskStore } from "@/store/task";

import { CalendarEvent, CalendarFeed } from "@/types/calendar";

// Dynamically import the appropriate version of the LifetimeAccessBanner
const LifetimeAccessBanner = dynamic(
  () => import(`./LifetimeAccessBanner.${isSaasEnabled ? "saas" : "open"}`).then(
    (mod) => mod.LifetimeAccessBanner
  ),
  { ssr: false } // Disable SSR for this component to prevent import errors
);

interface CalendarProps {
  initialFeeds?: CalendarFeed[];
  initialEvents?: CalendarEvent[];
}

export function Calendar({
  initialFeeds = [],
  initialEvents = [],
}: CalendarProps) {
  const { date: currentDate, setDate, view, setView } = useViewStore();
  const { isSidebarOpen, setSidebarOpen, isHydrated } = useCalendarUIStore();
  const { triggerScheduleAllTasks } = useTaskStore();
  const { calendar: calendarSettings, updateCalendarSettings } = useSettingsStore();
  const { setFeeds, setEvents } = useCalendarStore();

  // Use initial data from server for hydration
  useEffect(() => {
    if (initialFeeds.length > 0) {
      setFeeds(initialFeeds);
    }

    if (initialEvents.length > 0) {
      setEvents(initialEvents);
    }

    // Only fetch from database if we didn't get initial data
    if (!initialFeeds.length || !initialEvents.length) {
      useCalendarStore.getState().loadFromDatabase();
    }

    // Always fetch tasks since they're not pre-loaded
    useTaskStore.getState().fetchTasks();
  }, [initialFeeds, initialEvents, setFeeds, setEvents]);

  // Auto-sync: poll feeds based on their individual autoSync + syncInterval settings
  const { feeds: allFeeds, syncFeed } = useCalendarStore();
  const syncInProgress = useRef(false);
  const lastSyncTimes = useRef<Map<string, number>>(new Map());

  const runAutoSync = useCallback(async () => {
    if (syncInProgress.current) return;
    syncInProgress.current = true;
    const now = Date.now();
    try {
      const feedsToSync = allFeeds.filter((f) => {
        if (!f.enabled || !f.autoSync) return false;
        const lastSync = lastSyncTimes.current.get(f.id) || 0;
        const intervalMs = (f.syncInterval || 5) * 60 * 1000;
        return now - lastSync >= intervalMs;
      });
      if (feedsToSync.length === 0) return;

      // Sync all due feeds with skipSchedule=true, then schedule once at the end
      for (let i = 0; i < feedsToSync.length; i++) {
        try {
          await syncFeed(feedsToSync[i].id, true);
          lastSyncTimes.current.set(feedsToSync[i].id, Date.now());
        } catch {
          // Quiet fail on auto-sync
        }
        // Stagger requests to avoid hitting GCal API rate limits
        if (i < feedsToSync.length - 1) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      // Schedule once after all feeds are synced
      const { triggerScheduleAllTasks } = useTaskStore.getState();
      await triggerScheduleAllTasks();
    } finally {
      syncInProgress.current = false;
    }
  }, [allFeeds, syncFeed]);

  useEffect(() => {
    const hasAutoSync = allFeeds.some((f) => f.enabled && f.autoSync);
    if (!hasAutoSync) return;

    // Run initial sync on mount
    runAutoSync();

    // Check every minute which feeds are due for sync
    const id = setInterval(runAutoSync, 60 * 1000);
    return () => clearInterval(id);
  }, [allFeeds, runAutoSync]);

  const handlePrevWeek = () => {
    if (view === "month" || view === "multiMonth") {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() - 1);
      setDate(newDate);
    } else {
      const days = view === "day" ? 1 : 7;
      setDate(subDays(currentDate, days));
    }
  };

  const handleNextWeek = () => {
    if (view === "month" || view === "multiMonth") {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + 1);
      setDate(newDate);
    } else {
      const days = view === "day" ? 1 : 7;
      setDate(addDays(currentDate, days));
    }
  };

  const handleAutoSchedule = async () => {
    await triggerScheduleAllTasks();
  };

  return (
    <div className="flex h-full w-full">
      {/* Sidebar */}
      <aside
        className={cn(
          "h-full w-80 flex-none border-r border-gray-200 bg-white",
          "transform transition-transform duration-300 ease-in-out",
          !isHydrated && "opacity-0 duration-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ marginLeft: isSidebarOpen ? 0 : "-20rem" }}
      >
        <div className="flex h-full flex-col">
          {/* Feed Manager */}
          <div className="flex-1 overflow-y-auto">
            <FeedManager />
          </div>

        </div>
      </aside>

      {/* Main Content */}
      <main className="flex min-w-0 flex-1 flex-col bg-background">
        {/* Lifetime Access Banner */}
        <LifetimeAccessBanner />
        {/* Header */}
        <header className="flex h-16 flex-none items-center border-b border-border px-4">
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="rounded-lg p-2 text-foreground hover:bg-muted"
            title="Toggle Sidebar (b)"
          >
            <HiMenu className="h-5 w-5" />
          </button>

          <div className="ml-4 flex items-center gap-4">
            <button
              onClick={() => setDate(newDate())}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
              title="Go to Today (t)"
            >
              Today
            </button>

            <button
              onClick={handleAutoSchedule}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10"
            >
              Auto Schedule
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevWeek}
                className="rounded-lg p-1.5 text-foreground hover:bg-muted"
                data-testid="calendar-prev-week"
                title="Previous Week (←)"
              >
                <IoChevronBack className="h-5 w-5" />
              </button>
              <button
                onClick={handleNextWeek}
                className="rounded-lg p-1.5 text-foreground hover:bg-muted"
                data-testid="calendar-next-week"
                title="Next Week (→)"
              >
                <IoChevronForward className="h-5 w-5" />
              </button>
            </div>

            <h1 className="text-xl font-semibold text-foreground">
              {formatDate(currentDate)}
            </h1>
          </div>

          {/* Slot Duration Toggle */}
          <div className="ml-auto mr-4 flex items-center gap-1 rounded-lg border border-border p-0.5">
            {[15, 30, 60].map((mins) => (
              <button
                key={mins}
                onClick={() => updateCalendarSettings({ slotDuration: mins })}
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                  (calendarSettings.slotDuration || 30) === mins
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title={`${mins} minute intervals`}
              >
                {mins}m
              </button>
            ))}
          </div>

          {/* View Switching Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("day")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                view === "day"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              Day
            </button>
            <button
              onClick={() => setView("week")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                view === "week"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              Week
            </button>
            <button
              onClick={() => setView("month")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                view === "month"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              Month
            </button>
            <button
              onClick={() => setView("multiMonth")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                view === "multiMonth"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              Year
            </button>
          </div>
        </header>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-hidden">
          {view === "day" ? (
            <DayView currentDate={currentDate} onDateClick={setDate} />
          ) : view === "week" ? (
            <WeekView currentDate={currentDate} onDateClick={setDate} />
          ) : view === "month" ? (
            <MonthView currentDate={currentDate} onDateClick={setDate} />
          ) : (
            <MultiMonthView currentDate={currentDate} onDateClick={setDate} />
          )}
        </div>
      </main>
    </div>
  );
}
