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

interface BoardTaskProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const energyLevelColors = {
  high: "bg-red-100 text-red-800",
  medium: "bg-orange-100 text-orange-800",
  low: "bg-green-100 text-green-800",
};

const timePreferenceColors = {
  [TimePreference.MORNING]: "bg-sky-100 text-sky-800",
  [TimePreference.AFTERNOON]: "bg-amber-100 text-amber-800",
  [TimePreference.EVENING]: "bg-indigo-100 text-indigo-800",
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
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-grab p-3 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {task.isAutoScheduled && (
              <div
                className="flex items-center gap-1 text-blue-600"
                title="Auto-scheduled"
              >
                <HiClock className="h-4 w-4" />
                {task.scheduleLocked && (
                  <HiLockClosed className="h-3 w-3" title="Schedule locked" />
                )}
              </div>
            )}
            <h3 className="text-sm font-medium text-gray-900 task-title">
              {task.title}
            </h3>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
              className="p-1 text-gray-400 hover:text-blue-600 rounded-md hover:bg-gray-100"
              title="Edit task"
            >
              <HiPencil className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-100"
              title="Delete task"
            >
              <HiTrash className="h-4 w-4" />
            </button>
          </div>
        </div>

        {task.description && (
          <p className="text-xs text-gray-500 line-clamp-2 task-description">
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
                  backgroundColor: tag.color || "#E5E7EB",
                  color: "#1F2937",
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
              className={`px-2 py-1 rounded-full ${
                energyLevelColors[task.energyLevel]
              }`}
            >
              {formatEnumValue(task.energyLevel)}
            </span>
          )}

          {task.preferredTime && (
            <span
              className={`px-2 py-1 rounded-full ${
                timePreferenceColors[task.preferredTime]
              }`}
            >
              {formatEnumValue(task.preferredTime)}
            </span>
          )}

          {task.duration && (
            <span className="text-gray-500">{task.duration}m</span>
          )}

          {task.dueDate && (
            <span
              className={`${
                formatContextualDate(newDate(task.dueDate)).isOverdue
                  ? "text-red-600"
                  : "text-gray-500"
              }`}
            >
              {formatContextualDate(newDate(task.dueDate)).text}
            </span>
          )}

          {task.project && (
            <div className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: task.project.color || "#E5E7EB" }}
              />
              <span className="text-gray-500">{task.project.name}</span>
            </div>
          )}

          {task.isAutoScheduled && task.scheduledStart && task.scheduledEnd && (
            <span className="text-blue-600">
              {format(newDate(task.scheduledStart), "p")} -{" "}
              {format(newDate(task.scheduledEnd), "p")}
              {task.scheduleScore && (
                <span className="ml-1 text-blue-500">
                  ({Math.round(task.scheduleScore * 100)}%)
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
