import { memo } from "react";
import { IoRepeat, IoCheckmarkCircle, IoTimeOutline } from "react-icons/io5";
import { cn } from "@/lib/utils";
import type { EventContentArg } from "@fullcalendar/core";
import { Priority } from "@/types/task";

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
  const isTask = eventInfo.event.extendedProps.isTask;
  const isRecurring = eventInfo.event.extendedProps.isRecurring;
  const status = eventInfo.event.extendedProps.status;
  const priority = eventInfo.event.extendedProps.priority;
  const location = eventInfo.event.extendedProps.location;
  const title = eventInfo.event.title;
  // console.log("eventInfo.event.extendedProps", eventInfo.event.extendedProps);

  return (
    <div
      data-testid={isTask ? "calendar-task" : "calendar-event"}
      className={cn(
        "flex items-center gap-1 text-xs overflow-hidden h-full",
        isTask && "border-l-4",
        isTask && priority && priorityColors[priority as Priority],
        isTask &&
          !priority && {
            "border-green-500": status === "completed",
            "border-yellow-500": status === "in_progress",
            "border-gray-500": status === "todo",
          }
      )}
    >
      {isTask ? (
        <IoCheckmarkCircle className="flex-shrink-0 h-3 w-3 text-current opacity-75" />
      ) : isRecurring ? (
        <IoRepeat className="flex-shrink-0 h-3 w-3 text-current opacity-75" />
      ) : (
        <IoTimeOutline className="flex-shrink-0 h-3 w-3 text-current opacity-75" />
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{title} - {priority}</div>
        {location && (
          <div className="truncate opacity-80 text-[10px]">{location}</div>
        )}
      </div>
    </div>
  );
});
