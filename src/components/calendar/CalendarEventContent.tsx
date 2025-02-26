import { memo } from "react";
import { IoRepeat, IoCheckmarkCircle, IoTimeOutline } from "react-icons/io5";
import { cn } from "@/lib/utils";
import type { EventContentArg } from "@fullcalendar/core";
import { Priority, TaskStatus } from "@/types/task";
import { isTaskOverdue } from "@/lib/task-utils";

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
  const dueDate = eventInfo.event.extendedProps?.extendedProps?.dueDate;
  const title = eventInfo.event.title;

  const isOverdue = isTask && isTaskOverdue({ dueDate, status });

  return (
    <div
      data-testid={isTask ? "calendar-task" : "calendar-event"}
      className={cn(
        "flex items-center gap-1 text-xs overflow-hidden h-full",
        isTask && "border-l-4",
        isTask && "text-gray-700",
        isTask && priority && priorityColors[priority as Priority],
        isTask &&
          !priority && {
            "border-green-500": status === TaskStatus.COMPLETED,
            "border-yellow-500": status === TaskStatus.IN_PROGRESS,
            "border-gray-500": status === TaskStatus.TODO,
          },
        isOverdue && "text-red-600 font-medium border-red-500",
        status === TaskStatus.COMPLETED && "text-gray-500 line-through"
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
        <div className="font-medium truncate calendar-event-title">{title}</div>
        {location && (
          <div className="truncate opacity-80 text-[10px] event-location">
            {location}
          </div>
        )}
      </div>
    </div>
  );
});
