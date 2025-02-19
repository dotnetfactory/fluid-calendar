"use client";

import { useState } from "react";
import { HiMenu } from "react-icons/hi";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { formatDate } from "@/lib/utils";
import { WeekView } from "@/components/calendar/WeekView";
import { FeedManager } from "@/components/calendar/FeedManager";
import { addDays, subDays } from "@/lib/date-utils";
import { useViewStore } from "@/store/calendar";
import { useTaskStore } from "@/store/task";
import { cn } from "@/lib/utils";

export function Calendar() {
  const { date: currentDate, setDate } = useViewStore();
  const { scheduleAllTasks } = useTaskStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handlePrevWeek = () => {
    setDate(subDays(currentDate, 7));
  };

  const handleNextWeek = () => {
    setDate(addDays(currentDate, 7));
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
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ marginLeft: sidebarOpen ? 0 : "-20rem" }}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Calendars</h2>
          </div>

          {/* Feed Manager */}
          <div className="flex-1 overflow-y-auto">
            <FeedManager />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Header */}
        <header className="h-16 border-b border-gray-200 flex items-center px-4 flex-none">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <HiMenu className="w-5 h-5" />
          </button>

          <div className="ml-4 flex items-center gap-4">
            <button
              onClick={() => setDate(new Date())}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Today
            </button>

            <button
              onClick={handleAutoSchedule}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              Auto Schedule
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevWeek}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
                data-testid="calendar-prev-week"
              >
                <IoChevronBack className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextWeek}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
                data-testid="calendar-next-week"
              >
                <IoChevronForward className="w-5 h-5" />
              </button>
            </div>

            <h1 className="text-xl font-semibold">{formatDate(currentDate)}</h1>
          </div>
        </header>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-hidden">
          <WeekView currentDate={currentDate} onDateClick={setDate} />
        </div>
      </main>
    </div>
  );
}
