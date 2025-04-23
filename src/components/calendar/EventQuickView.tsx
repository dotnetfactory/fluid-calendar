import * as Popover from "@radix-ui/react-popover";
import { HiPencil, HiTrash } from "react-icons/hi";
import {
  IoCalendarOutline,
  IoFlagOutline,
  IoFolderOutline,
  IoLocationOutline,
  IoLockClosedOutline,
  IoPeopleOutline,
  IoRepeat,
  IoTimeOutline,
} from "react-icons/io5";

import { format, isFutureDate, newDate } from "@/lib/date-utils";
import { isTaskOverdue } from "@/lib/task-utils";
import { cn } from "@/lib/utils";

import { AttendeeStatus, CalendarEvent } from "@/types/calendar";
import { Priority, Task, TaskStatus } from "@/types/task";

interface Attendee {
  name?: string;
  email: string;
  status?: AttendeeStatus;
}

interface EventQuickViewProps {
  isOpen: boolean;
  onClose: () => void;
  item:
    | (CalendarEvent & {
        attendees?: Attendee[];
        extendedProps?: { isTask?: boolean };
      })
    | (Task & { project?: { name: string; color?: string | null } | null });
  onEdit: () => void;
  onDelete: () => void;
  position: { x: number; y: number };
  isTask: boolean;
}

//TODO: move to utils
const priorityColors = {
  [Priority.HIGH]: "text-destructive dark:text-destructive",
  [Priority.MEDIUM]: "text-warning dark:text-warning",
  [Priority.LOW]: "text-primary dark:text-primary",
  [Priority.NONE]: "text-muted-foreground",
};

export function EventQuickView({
  isOpen,
  onClose,
  item,
  onEdit,
  onDelete,
  position,
  isTask,
}: EventQuickViewProps) {
  const getStatusColor = (status: string | undefined) => {
    switch (status?.toUpperCase()) {
      case "ACCEPTED":
      case TaskStatus.COMPLETED:
        return "text-green-600 dark:text-green-400";
      case "TENTATIVE":
      case TaskStatus.IN_PROGRESS:
        return "text-warning dark:text-warning";
      case "DECLINED":
        return "text-destructive dark:text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  // Cast item to the appropriate type based on isTask
  const taskItem = isTask ? (item as Task) : null;
  const eventItem = !isTask
    ? (item as CalendarEvent & { attendees?: Attendee[] })
    : null;

  const isOverdue = taskItem && isTaskOverdue(taskItem);

  return (
    <Popover.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Popover.Portal>
        <Popover.Content
          className="z-[10000] w-80 rounded-lg border border-border bg-background p-4 shadow-lg"
          style={{
            position: "fixed",
            left: position.x,
            top: position.y,
          }}
          onOpenAutoFocus={(e) => e.preventDefault()}
          side="bottom"
          align="start"
          sideOffset={5}
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="event-title flex items-center gap-2 font-medium text-foreground">
                {item.title}
                {isTask ? (
                  <>
                    {taskItem?.isRecurring && (
                      <IoRepeat
                        className="h-4 w-4 text-primary"
                        title="Recurring task"
                      />
                    )}
                    {taskItem?.scheduleLocked && (
                      <IoLockClosedOutline
                        className="h-4 w-4 text-warning"
                        title="Schedule locked"
                      />
                    )}
                  </>
                ) : (
                  eventItem?.isRecurring && (
                    <IoRepeat
                      className="h-4 w-4 text-primary"
                      title="Recurring event"
                    />
                  )
                )}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={onEdit}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
                  title="Edit"
                >
                  <HiPencil className="h-4 w-4" />
                </button>
                <button
                  onClick={onDelete}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                  title="Delete"
                >
                  <HiTrash className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!isTask && eventItem && (
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <IoTimeOutline className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {format(newDate(eventItem.start), "PPp")} -{" "}
                    {format(
                      newDate(eventItem.end),
                      eventItem.allDay ? "PP" : "p"
                    )}
                  </span>
                </div>
                {eventItem.location && (
                  <div className="flex items-center gap-2">
                    <IoLocationOutline className="h-4 w-4 flex-shrink-0" />
                    <span className="event-location line-clamp-2">
                      {eventItem.location}
                    </span>
                  </div>
                )}
                {eventItem.attendees && eventItem.attendees.length > 0 && (
                  <div className="flex items-start gap-2">
                    <IoPeopleOutline className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div className="flex-1">
                      {eventItem.attendees.map((attendee) => (
                        <div
                          key={attendee.email}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="event-attendees flex-1 truncate">
                            {attendee.name || attendee.email}
                          </span>
                          <span
                            className={cn(
                              "ml-2 flex-shrink-0",
                              getStatusColor(attendee.status)
                            )}
                          >
                            {attendee.status?.toLowerCase() || "pending"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {eventItem.description && (
                  <div className="event-description mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {eventItem.description}
                  </div>
                )}
              </div>
            )}

            {isTask && taskItem && (
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IoTimeOutline className="h-4 w-4 flex-shrink-0" />
                    {taskItem.dueDate ? (
                      <span
                        className={cn(
                          isOverdue &&
                            "text-destructive dark:text-destructive font-medium",
                          isFutureDate(taskItem.dueDate) &&
                            "text-primary font-medium"
                        )}
                      >
                        Due {format(newDate(taskItem.dueDate), "PPp")}
                        {isOverdue && " (OVERDUE)"}
                        {isFutureDate(taskItem.dueDate) && " (UPCOMING)"}
                      </span>
                    ) : (
                      <span>No due date</span>
                    )}
                  </div>
                  <span
                    className={cn("rounded-full px-2 py-0.5 text-xs", {
                      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100":
                        taskItem.status === TaskStatus.COMPLETED,
                      "bg-warning/10 text-warning":
                        taskItem.status === TaskStatus.IN_PROGRESS,
                      "bg-muted text-muted-foreground":
                        taskItem.status === TaskStatus.TODO,
                    })}
                  >
                    {taskItem.status.toLowerCase().replace("_", " ")}
                  </span>
                </div>

                {taskItem.startDate && (
                  <div className="flex items-center gap-2">
                    <IoCalendarOutline className="h-4 w-4 flex-shrink-0" />
                    <span
                      className={cn(
                        isFutureDate(taskItem.startDate) &&
                          "text-primary font-medium"
                      )}
                    >
                      Starts {format(newDate(taskItem.startDate), "PPp")}
                      {isFutureDate(taskItem.startDate) && " (UPCOMING)"}
                    </span>
                  </div>
                )}

                {taskItem.priority && (
                  <div className="flex items-center gap-2">
                    <IoFlagOutline className="h-4 w-4 flex-shrink-0" />
                    <span
                      className={cn(
                        "text-sm",
                        priorityColors[taskItem.priority]
                      )}
                    >
                      {taskItem.priority.charAt(0).toUpperCase() +
                        taskItem.priority.slice(1)}{" "}
                      Priority
                    </span>
                  </div>
                )}

                {taskItem.isAutoScheduled &&
                  taskItem.scheduledStart &&
                  taskItem.scheduledEnd && (
                    <div className="flex items-center gap-2">
                      <IoCalendarOutline className="h-4 w-4 flex-shrink-0" />
                      <div className="flex-1">
                        <div>
                          Scheduled:{" "}
                          {format(newDate(taskItem.scheduledStart), "PPp")} -{" "}
                          {format(newDate(taskItem.scheduledEnd), "p")}
                        </div>
                        {taskItem.scheduleScore !== undefined && (
                          <div className="text-xs text-muted-foreground">
                            Confidence:{" "}
                            {Math.round((taskItem.scheduleScore ?? 0) * 100)}%
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                {taskItem.project && (
                  <div className="flex items-center gap-2">
                    <IoFolderOutline className="h-4 w-4 flex-shrink-0" />
                    <span
                      className="rounded px-2 py-0.5 text-xs"
                      style={{
                        backgroundColor:
                          (taskItem.project.color || "hsl(var(--primary))") +
                          "20",
                        color: taskItem.project.color || "hsl(var(--primary))",
                      }}
                    >
                      {taskItem.project.name}
                    </span>
                  </div>
                )}

                {taskItem.duration && (
                  <div className="flex items-center gap-2">
                    <IoTimeOutline className="h-4 w-4 flex-shrink-0" />
                    <span>Duration: {taskItem.duration} minutes</span>
                  </div>
                )}

                {taskItem.tags && taskItem.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {taskItem.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs"
                        style={{
                          backgroundColor:
                            (tag.color || "hsl(var(--primary))") + "20",
                          color: tag.color || "hsl(var(--primary))",
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}

                {taskItem.description && (
                  <div className="task-description mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {taskItem.description}
                  </div>
                )}
              </div>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
