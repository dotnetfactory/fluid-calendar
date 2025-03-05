"use client";

import { Task, TimePreference } from "@/types/task";
import { useDraggable } from "@dnd-kit/core";
import { HiPencil, HiTrash, HiClock, HiLockClosed } from "react-icons/hi";
import {
  format,
  isToday,
  isTomorrow,
  isThisWeek,
  isThisYear,
  newDateFromYMD,
  newDate,
} from "@/lib/date-utils";
import { cn } from "@/lib/utils";

interface BoardTaskProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const energyLevelColors = {
  high: "bg-red-500/20 text-red-700 dark:text-red-400",
  medium: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  low: "bg-green-500/20 text-green-700 dark:text-green-400",
};

const timePreferenceColors = {
  [TimePreference.MORNING]: "bg-sky-500/20 text-sky-700 dark:text-sky-400",
  [TimePreference.AFTERNOON]:
    "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  [TimePreference.EVENING]:
    "bg-indigo-500/20 text-indigo-700 dark:text-indigo-400",
};

// Helper function to format enum values for display
const formatEnumValue = (value: string) => {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const formatContextualDate = (date: Date) => {
  const localDate = newDateFromYMD(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
  const now = newDate();
  now.setHours(0, 0, 0, 0);

  const isOverdue = localDate < now;
  let text = "";
  if (isToday(localDate)) {
    text = "Today";
  } else if (isTomorrow(localDate)) {
    text = "Tomorrow";
  } else if (isThisWeek(localDate)) {
    text = format(localDate, "EEEE");
  } else if (isThisYear(localDate)) {
    text = format(localDate, "MMM d");
  } else {
    text = format(localDate, "MMM d, yyyy");
  }
  if (isOverdue) {
    text = `Overdue: ${text}`;
  }
  return { text, isOverdue };
};

export function BoardTask({ task, onEdit, onDelete }: BoardTaskProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: {
        type: "task",
        task,
      },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div className="relative group">
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        style={style}
        className={cn(
          "bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-grab p-3",
          isDragging && "opacity-50"
        )}
      >
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-2">
              {task.isAutoScheduled && (
                <div
                  className="flex items-center gap-1 text-primary"
                  title="Auto-scheduled"
                >
                  <HiClock className="h-4 w-4" />
                  {task.scheduleLocked && (
                    <HiLockClosed className="h-3 w-3" title="Schedule locked" />
                  )}
                </div>
              )}
              <h3 className="text-sm font-medium task-title">{task.title}</h3>
            </div>
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 task-description">
              {task.description}
            </p>
          )}

          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: `${tag.color}20` || "var(--muted)",
                    color: tag.color || "var(--muted-foreground)",
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {task.energyLevel && (
              <span
                className={cn(
                  "px-2 py-1 rounded-full",
                  energyLevelColors[task.energyLevel]
                )}
              >
                {formatEnumValue(task.energyLevel)}
              </span>
            )}

            {task.preferredTime && (
              <span
                className={cn(
                  "px-2 py-1 rounded-full",
                  timePreferenceColors[task.preferredTime]
                )}
              >
                {formatEnumValue(task.preferredTime)}
              </span>
            )}

            {task.duration && (
              <span className="text-muted-foreground">{task.duration}m</span>
            )}

            {task.dueDate && (
              <span
                className={cn(
                  formatContextualDate(newDate(task.dueDate)).isOverdue
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {formatContextualDate(newDate(task.dueDate)).text}
              </span>
            )}

            {task.project && (
              <div className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: task.project.color || "var(--muted)",
                  }}
                />
                <span className="text-muted-foreground">
                  {task.project.name}
                </span>
              </div>
            )}

            {task.isAutoScheduled &&
              task.scheduledStart &&
              task.scheduledEnd && (
                <span className="text-primary">
                  {format(newDate(task.scheduledStart), "p")} -{" "}
                  {format(newDate(task.scheduledEnd), "p")}
                  {task.scheduleScore && (
                    <span className="ml-1 text-primary/70">
                      ({Math.round(task.scheduleScore * 100)}%)
                    </span>
                  )}
                </span>
              )}
          </div>
        </div>
      </div>
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="p-1 text-muted-foreground hover:text-primary rounded-md hover:bg-muted"
          title="Edit task"
        >
          <HiPencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="p-1 text-muted-foreground hover:text-destructive rounded-md hover:bg-muted"
          title="Delete task"
        >
          <HiTrash className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
