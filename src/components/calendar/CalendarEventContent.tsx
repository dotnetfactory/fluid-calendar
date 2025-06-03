import { memo } from "react";

import type { EventContentArg } from "@fullcalendar/core";
import { IoCheckmarkCircle, IoRepeat, IoTimeOutline } from "react-icons/io5";

import { format } from "@/lib/date-utils";
import { isTaskOverdue } from "@/lib/task-utils";
import { cn } from "@/lib/utils";

import { useSettingsStore } from "@/store/settings";

import { Priority, TaskStatus } from "@/types/task";

interface CalendarEventContentProps {
  eventInfo: EventContentArg;
}

const priorityColors = {
  [Priority.HIGH]: "border-red-500",
  [Priority.MEDIUM]: "border-orange-500",
  [Priority.LOW]: "border-blue-500",
  [Priority.NONE]: "border-gray-500",
};

export const CalendarEventContent = memo(function CalendarEventContent({
  eventInfo,
}: CalendarEventContentProps) {
  const { user: userSettings } = useSettingsStore();
  const isTask = eventInfo.event.extendedProps.isTask;
  const isRecurring = eventInfo.event.extendedProps.isRecurring;
  const status = eventInfo.event.extendedProps.status;
  const priority = eventInfo.event.extendedProps.priority;
  const location = eventInfo.event.extendedProps.location;
  const dueDate = eventInfo.event.extendedProps?.extendedProps?.dueDate;
  const title = eventInfo.event.title;
  const endTime = eventInfo.event.end?.getTime() ?? 0;
  const startTime = eventInfo.event.start?.getTime() ?? 0;
  const duration = endTime - startTime;
  const isAllDay = eventInfo.event.allDay;

  // Get the calendar color from the event's backgroundColor
  const calendarColor = eventInfo.event.backgroundColor;

  const isOverdue = isTask && isTaskOverdue({ dueDate, status });

  // Format start time for display
  const formatEventTime = (date: Date) => {
    const timeFormat = userSettings?.timeFormat === "12h" ? "h:mm a" : "HH:mm";
    return format(date, timeFormat);
  };

  const eventStartTime = eventInfo.event.start ? formatEventTime(eventInfo.event.start) : "";

  return (
    <div
      data-testid={isTask ? "calendar-task" : "calendar-event"}
      className={cn(
        "flex h-full flex-col justify-start gap-1 overflow-hidden text-[11px]",
        isTask && "border-l-4",
        isTask && "text-gray-700",
        isTask && priority && priorityColors[priority as Priority],
        isTask &&
        !priority && {
          "border-green-500": status === TaskStatus.COMPLETED,
          "border-yellow-500": status === TaskStatus.IN_PROGRESS,
          "border-gray-500": status === TaskStatus.TODO,
        },
        isOverdue && "border-red-500 font-medium text-red-600",
        status === TaskStatus.COMPLETED && "text-gray-500 line-through"
      )}
    >
      <div className="flex w-full items-center gap-1.5">
        {isTask ? (
          <IoCheckmarkCircle className="h-3.5 w-3.5 flex-shrink-0 text-current opacity-75" />
        ) : isRecurring ? (
          <div className="flex items-center gap-1">
            <div
              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: calendarColor }}
            />
            <IoRepeat className="h-3.5 w-3.5 flex-shrink-0 text-current opacity-75" />
          </div>
        ) : !isAllDay ? (
          <div className="flex items-center gap-1">
            <div
              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: calendarColor }}
            />
            <IoTimeOutline className="h-3 w-3 flex-shrink-0 text-current opacity-75" />
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <div
              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: calendarColor }}
            />
            <IoTimeOutline className="h-3.5 w-3.5 flex-shrink-0 text-current opacity-75" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "calendar-event-title font-medium leading-snug",
              duration <= 1800000 ? "truncate" : "line-clamp-2 break-words"
            )}
          >
            {title}
          </div>
          {/* Display time for timed events */}
          {!isTask && !isAllDay && eventStartTime && (
            <div className="text-[10px] leading-snug opacity-80 truncate">
              {eventStartTime}
            </div>
          )}
        </div>
      </div>
      {location && duration > 1800000 && (
        <div className="event-location truncate pl-5 text-[10px] leading-snug opacity-80">
          {location}
        </div>
      )}
    </div>
  );
});
