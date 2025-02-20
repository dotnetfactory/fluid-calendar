import * as Popover from "@radix-ui/react-popover";
import { CalendarEvent, AttendeeStatus } from "@/types/calendar";
import { Task, TaskStatus } from "@/types/task";
import { format } from "@/lib/date-utils";
import {
  IoTimeOutline,
  IoLocationOutline,
  IoRepeat,
  IoPeopleOutline,
  IoCalendarOutline,
  IoLockClosedOutline,
  IoFolderOutline,
} from "react-icons/io5";
import { HiPencil, HiTrash } from "react-icons/hi";
import { cn } from "@/lib/utils";

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
        return "text-green-600";
      case "TENTATIVE":
      case TaskStatus.IN_PROGRESS:
        return "text-yellow-600";
      case "DECLINED":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  // Cast item to the appropriate type based on isTask
  const taskItem = isTask ? (item as Task) : null;
  const eventItem = !isTask
    ? (item as CalendarEvent & { attendees?: Attendee[] })
    : null;

  return (
    <Popover.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Popover.Portal>
        <Popover.Content
          className="rounded-lg bg-white shadow-lg border border-gray-200 w-80 p-4 z-[10000]"
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
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                {item.title}
                {isTask ? (
                  <>
                    {taskItem?.isRecurring && (
                      <IoRepeat
                        className="h-4 w-4 text-blue-500"
                        title="Recurring task"
                      />
                    )}
                    {taskItem?.scheduleLocked && (
                      <IoLockClosedOutline
                        className="h-4 w-4 text-orange-500"
                        title="Schedule locked"
                      />
                    )}
                  </>
                ) : (
                  eventItem?.isRecurring && (
                    <IoRepeat
                      className="h-4 w-4 text-blue-500"
                      title="Recurring event"
                    />
                  )
                )}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={onEdit}
                  className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-gray-100"
                  title="Edit"
                >
                  <HiPencil className="h-4 w-4" />
                </button>
                <button
                  onClick={onDelete}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-100"
                  title="Delete"
                >
                  <HiTrash className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!isTask && eventItem && (
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <IoTimeOutline className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {format(new Date(eventItem.start), "PPp")} -{" "}
                    {format(
                      new Date(eventItem.end),
                      eventItem.allDay ? "PP" : "p"
                    )}
                  </span>
                </div>
                {eventItem.location && (
                  <div className="flex items-center gap-2">
                    <IoLocationOutline className="h-4 w-4 flex-shrink-0" />
                    <span className="line-clamp-2">{eventItem.location}</span>
                  </div>
                )}
                {eventItem.attendees && eventItem.attendees.length > 0 && (
                  <div className="flex items-start gap-2">
                    <IoPeopleOutline className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      {eventItem.attendees.map((attendee) => (
                        <div
                          key={attendee.email}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="truncate flex-1">
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
                  <div className="text-xs mt-2 text-gray-500 line-clamp-2">
                    {eventItem.description}
                  </div>
                )}
              </div>
            )}

            {isTask && taskItem && (
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IoTimeOutline className="h-4 w-4 flex-shrink-0" />
                    {taskItem.dueDate ? (
                      <span>
                        Due {format(new Date(taskItem.dueDate), "PPp")}
                      </span>
                    ) : (
                      <span>No due date</span>
                    )}
                  </div>
                  <span
                    className={cn("text-xs px-2 py-0.5 rounded-full", {
                      "bg-green-100 text-green-800":
                        taskItem.status === TaskStatus.COMPLETED,
                      "bg-yellow-100 text-yellow-800":
                        taskItem.status === TaskStatus.IN_PROGRESS,
                      "bg-gray-100 text-gray-800":
                        taskItem.status === TaskStatus.TODO,
                    })}
                  >
                    {taskItem.status.toLowerCase().replace("_", " ")}
                  </span>
                </div>

                {taskItem.isAutoScheduled &&
                  taskItem.scheduledStart &&
                  taskItem.scheduledEnd && (
                    <div className="flex items-center gap-2">
                      <IoCalendarOutline className="h-4 w-4 flex-shrink-0" />
                      <div className="flex-1">
                        <div>
                          Scheduled:{" "}
                          {format(new Date(taskItem.scheduledStart), "PPp")} -{" "}
                          {format(new Date(taskItem.scheduledEnd), "p")}
                        </div>
                        {taskItem.scheduleScore !== undefined && (
                          <div className="text-xs text-gray-500">
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
                      className="px-2 py-0.5 rounded text-xs"
                      style={{
                        backgroundColor:
                          (taskItem.project.color || "#3b82f6") + "20",
                        color: taskItem.project.color || "#3b82f6",
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
                  <div className="flex flex-wrap gap-1 mt-2">
                    {taskItem.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs"
                        style={{
                          backgroundColor: (tag.color || "#3b82f6") + "20",
                          color: tag.color || "#3b82f6",
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}

                {taskItem.description && (
                  <div className="text-xs mt-2 text-gray-500 line-clamp-2">
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
