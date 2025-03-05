"use client";

import { Task, TaskStatus } from "@/types/task";
import { useDroppable } from "@dnd-kit/core";
import { BoardTask } from "./BoardTask";
import { cn } from "@/lib/utils";

interface ColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const statusColors = {
  [TaskStatus.TODO]: "bg-yellow-500/10 border-yellow-500/20",
  [TaskStatus.IN_PROGRESS]: "bg-blue-500/10 border-blue-500/20",
  [TaskStatus.COMPLETED]: "bg-green-500/10 border-green-500/20",
};

const statusHeaderColors = {
  [TaskStatus.TODO]: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  [TaskStatus.IN_PROGRESS]: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  [TaskStatus.COMPLETED]: "bg-green-500/20 text-green-700 dark:text-green-400",
};

// Helper function to format enum values for display
const formatEnumValue = (value: string) => {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export function Column({ status, tasks, onEdit, onDelete }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-80 flex flex-col bg-background rounded-lg border",
        statusColors[status],
        isOver && "ring-2 ring-ring"
      )}
    >
      <div className="p-2 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "px-2.5 py-0.5 rounded-full text-sm font-medium",
                statusHeaderColors[status]
              )}
            >
              {formatEnumValue(status)}
            </span>
            <span className="text-sm text-muted-foreground">
              {tasks.length}
            </span>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 p-2 overflow-y-auto">
        <div className="space-y-2">
          {tasks.map((task) => (
            <BoardTask
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
