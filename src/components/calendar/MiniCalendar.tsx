import { useState } from "react";

import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
} from "date-fns";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";

import { cn } from "@/lib/utils";

interface MiniCalendarProps {
  currentDate: Date;
  onDateClick?: (date: Date) => void;
}

export function MiniCalendar({ currentDate, onDateClick }: MiniCalendarProps) {
  const [calendarDate, setCalendarDate] = useState(currentDate);
  const monthStart = startOfMonth(calendarDate);
  const monthEnd = endOfMonth(calendarDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get day names with unique keys
  const weekDays = [
    { key: "mon", label: "M" },
    { key: "tue", label: "T" },
    { key: "wed", label: "W" },
    { key: "thu", label: "T" },
    { key: "fri", label: "F" },
    { key: "sat", label: "S" },
    { key: "sun", label: "S" },
  ];

  const handlePrevMonth = () => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCalendarDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCalendarDate(newDate);
  };

  // Get the day of week of the first day (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const firstDayOfMonth = monthStart.getDay();
  // Adjust for Monday start (transform Sunday from 0 to 7)
  const adjustedFirstDay = firstDayOfMonth === 0 ? 7 : firstDayOfMonth;
  // Calculate empty days needed before the first day
  const emptyDays = adjustedFirstDay - 1;

  return (
    <div className="mx-auto p-2">
      {/* Month Navigation */}
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-sm font-medium text-foreground">
          {format(calendarDate, "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className="rounded-full p-1 text-foreground hover:bg-muted/50"
          >
            <IoChevronBack className="h-4 w-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="rounded-full p-1 text-foreground hover:bg-muted/50"
          >
            <IoChevronForward className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0">
        {/* Weekday headers */}
        {weekDays.map((day) => (
          <div
            key={day.key}
            className="flex h-7 items-center justify-center text-xs font-medium text-muted-foreground"
          >
            {day.label}
          </div>
        ))}

        {/* Empty days */}
        {Array.from({ length: emptyDays }).map((_, index) => (
          <div key={`empty-${index}`} className="h-7" />
        ))}

        {/* Calendar days */}
        {days.map((day) => (
          <button
            key={day.toISOString()}
            onClick={() => onDateClick?.(day)}
            className={cn(
              "mx-0.5 flex h-7 items-center justify-center rounded-full text-xs",
              isSameDay(day, currentDate)
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : isToday(day)
                  ? "bg-accent text-accent-foreground hover:bg-accent/90"
                  : isSameMonth(day, calendarDate)
                    ? "text-foreground hover:bg-muted/50"
                    : "text-muted-foreground/50 hover:bg-muted/50"
            )}
          >
            {format(day, "d")}
          </button>
        ))}
      </div>
    </div>
  );
}
