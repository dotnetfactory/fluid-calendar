"use client";

import { HiMenu } from "react-icons/hi";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { WeekView } from "@/components/calendar/WeekView";
import { MonthView } from "@/components/calendar/MonthView";
import { MultiMonthView } from "@/components/calendar/MultiMonthView";
import { DayView } from "@/components/calendar/DayView";
import { FeedManager } from "@/components/calendar/FeedManager";
import { addDays, newDate, subDays, formatDate } from "@/lib/date-utils";
import { useViewStore, useCalendarUIStore } from "@/store/calendar";
import { useTaskStore } from "@/store/task";
import { cn } from "@/lib/utils";
import { SponsorshipBanner } from "@/components/ui/sponsorship-banner";

export function Calendar() {
  const { date: currentDate, setDate, view, setView } = useViewStore();
  const { isSidebarOpen, setSidebarOpen, isHydrated } = useCalendarUIStore();
  const { scheduleAllTasks } = useTaskStore();

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
    if (confirm("Auto-schedule all tasks marked for auto-scheduling?")) {
      await scheduleAllTasks();
    }
  };

  return (
    <div className="h-full w-full flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "h-full w-80 bg-white border-r border-gray-200 flex-none",
          "transform transition-transform duration-300 ease-in-out",
          !isHydrated && "duration-0 opacity-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ marginLeft: isSidebarOpen ? 0 : "-20rem" }}
      >
        <div className="flex flex-col h-full">
          {/* Feed Manager */}
          <div className="flex-1 overflow-y-auto">
            <FeedManager />
          </div>

          {/* Sponsorship Banner */}
          <SponsorshipBanner />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Header */}
        <header className="h-16 border-b border-border flex items-center px-4 flex-none">
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-muted rounded-lg text-foreground"
          >
            <HiMenu className="w-5 h-5" />
          </button>

          <div className="ml-4 flex items-center gap-4">
            <button
              onClick={() => setDate(newDate())}
              className="px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted rounded-lg"
            >
              Today
            </button>

            <button
              onClick={handleAutoSchedule}
              className="px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg"
            >
              Auto Schedule
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevWeek}
                className="p-1.5 hover:bg-muted rounded-lg text-foreground"
                data-testid="calendar-prev-week"
              >
                <IoChevronBack className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextWeek}
                className="p-1.5 hover:bg-muted rounded-lg text-foreground"
                data-testid="calendar-next-week"
              >
                <IoChevronForward className="w-5 h-5" />
              </button>
            </div>

            <h1 className="text-xl font-semibold text-foreground">
              {formatDate(currentDate)}
            </h1>
          </div>

          {/* View Switching Buttons */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setView("day")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-lg",
                view === "day"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              Day
            </button>
            <button
              onClick={() => setView("week")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-lg",
                view === "week"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              Week
            </button>
            <button
              onClick={() => setView("month")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-lg",
                view === "month"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              Month
            </button>
            <button
              onClick={() => setView("multiMonth")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-lg",
                view === "multiMonth"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
