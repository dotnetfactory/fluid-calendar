import { useState } from "react";

import {
  HiCheck,
  HiClock,
  HiCloud,
  HiLockClosed,
  HiMenuAlt4,
  HiPencil,
  HiPlus,
  HiRefresh,
  HiTrash,
  HiX,
} from "react-icons/hi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

import { format, isFutureDate, newDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

import { Task, TaskStatus } from "@/types/task";

import { useScheduleStore } from "@/store/schedule";
import { useTaskStore } from "@/store/task";

import { useDraggableTask } from "../../dnd/useDragAndDrop";
import { formatEnumValue, statusColors } from "../utils/task-list-utils";
import { EditableCell } from "./EditableCell";

function DepSearchDropdown({
  candidates,
  onSelect,
  onClose,
}: {
  candidates: Task[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = search
    ? candidates.filter((t) =>
        t.title.toLowerCase().includes(search.toLowerCase())
      )
    : candidates;

  return (
    <div className="relative">
      <input
        autoFocus
        type="text"
        placeholder="Search tasks..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onBlur={() => setTimeout(onClose, 200)}
        className="w-full rounded border bg-background px-1.5 py-0.5 text-xs"
      />
      {filtered.length > 0 && (
        <div className="absolute left-0 top-full z-20 mt-0.5 max-h-32 w-48 overflow-y-auto rounded border bg-background shadow-lg">
          {filtered.map((t) => (
            <button
              key={t.id}
              className="w-full px-2 py-1 text-left text-xs hover:bg-muted truncate"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(t.id);
              }}
            >
              {t.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface DepItem {
  depId: string;
  taskId: string;
  title: string;
  status: string;
}

function DependencyCell({
  task,
  direction,
  items,
  onRefresh,
}: {
  task: Task;
  direction: "blockedBy" | "blocking";
  items: DepItem[];
  onRefresh: (task: Task) => void;
}) {
  const [adding, setAdding] = useState(false);
  const { tasks } = useTaskStore();

  // Get other tasks in the same project as candidates
  const candidates = task.projectId
    ? tasks.filter(
        (t) =>
          t.projectId === task.projectId &&
          t.id !== task.id &&
          t.status !== TaskStatus.COMPLETED &&
          !items.some((d) => d.taskId === t.id)
      )
    : [];

  const addDependency = async (otherTaskId: string) => {
    try {
      const taskId = direction === "blockedBy" ? task.id : otherTaskId;
      const prereqId = direction === "blockedBy" ? otherTaskId : task.id;
      await fetch(`/api/tasks/${taskId}/dependencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prerequisiteId: prereqId, source: "manual" }),
      });
      onRefresh(task);
      setAdding(false);
    } catch {
      toast.error("Failed to add dependency");
    }
  };

  const removeDependency = async (otherTaskId: string) => {
    try {
      const taskId = direction === "blockedBy" ? task.id : otherTaskId;
      const prereqId = direction === "blockedBy" ? otherTaskId : task.id;
      await fetch(`/api/tasks/${taskId}/dependencies?prerequisiteId=${prereqId}`, {
        method: "DELETE",
      });
      onRefresh(task);
    } catch {
      toast.error("Failed to remove dependency");
    }
  };

  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item) => (
        <span
          key={item.depId}
          className="group/tip relative inline-flex items-center gap-1 text-xs text-muted-foreground"
        >
          <span className="pointer-events-none absolute bottom-full left-0 z-30 mb-1 hidden whitespace-nowrap rounded bg-foreground px-2 py-1 text-[10px] text-background shadow-lg group-hover/tip:block">
            {item.title}
          </span>
          <span
            className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
              item.status === "completed"
                ? "bg-green-500"
                : direction === "blockedBy"
                  ? "bg-orange-500"
                  : "bg-blue-500"
            }`}
          />
          <span className="block truncate">{item.title}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeDependency(item.taskId);
            }}
            className="hidden group-hover:inline text-muted-foreground hover:text-destructive"
          >
            <HiX className="h-3 w-3" />
          </button>
        </span>
      ))}
      {adding ? (
        <DepSearchDropdown
          candidates={candidates}
          onSelect={(id) => { addDependency(id); }}
          onClose={() => setAdding(false)}
        />
      ) : (
        candidates.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAdding(true);
            }}
            className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <HiPlus className="h-2.5 w-2.5" /> Add
          </button>
        )
      )}
    </div>
  );
}

interface TaskRowProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onInlineEdit: (task: Task) => void;
}

export function TaskRow({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  onInlineEdit,
}: TaskRowProps) {
  const { draggableProps, isDragging } = useDraggableTask(task);
  const { schedules } = useScheduleStore();
  const isFutureTask = task.startDate && isFutureDate(task.startDate);

  return (
    <tr
      key={task.id}
      className={cn(
        "transition-colors hover:bg-muted/50",
        isDragging ? "opacity-50" : "",
        isFutureTask ? "bg-muted/25 text-muted-foreground" : ""
      )}
    >
      <td className="px-3 py-2">
        <div
          className="cursor-grab text-muted-foreground hover:text-foreground"
          {...draggableProps}
          onClick={(e) => e.stopPropagation()}
        >
          <HiMenuAlt4 className="h-4 w-4" />
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-2">
        <div className="flex items-center gap-2">
          <Select
            value={task.status}
            onValueChange={(value) => {
              onStatusChange(task.id, value as TaskStatus);
            }}
            onOpenChange={(open) => {
              if (open) {
                // Prevent opening the task modal when clicking the select
                document.body.classList.add("status-select-open");
              } else {
                // Remove the class after a short delay to allow the click event to be processed
                setTimeout(() => {
                  document.body.classList.remove("status-select-open");
                }, 100);
              }
            }}
          >
            <SelectTrigger
              className="h-8 border-none bg-transparent p-0 shadow-none hover:bg-transparent focus:ring-0"
              onClick={(e) => e.stopPropagation()}
            >
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  statusColors[task.status]
                )}
              >
                {formatEnumValue(task.status)}
              </span>
            </SelectTrigger>
            <SelectContent>
              {Object.values(TaskStatus).map((status) => (
                <SelectItem key={status} value={status}>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      statusColors[status]
                    )}
                  >
                    {formatEnumValue(status)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "h-8 w-8 p-1",
              task.status === TaskStatus.COMPLETED
                ? "bg-green-500/20 text-green-700 hover:bg-green-500/30 dark:text-green-400"
                : "text-muted-foreground hover:bg-muted hover:text-green-600"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(
                task.id,
                task.status === TaskStatus.COMPLETED
                  ? TaskStatus.TODO
                  : TaskStatus.COMPLETED
              );
            }}
            title={
              task.status === TaskStatus.COMPLETED
                ? "Mark as todo"
                : "Mark as completed"
            }
          >
            <HiCheck className="h-5 w-5" />
          </Button>
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <EditableCell
            task={task}
            field="title"
            value={task.title}
            onSave={onInlineEdit}
          />

          {isFutureTask && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              Upcoming
            </span>
          )}

          {task.isRecurring && (
            <HiRefresh
              className="h-4 w-4 shrink-0 text-blue-500"
              title="Recurring task"
            />
          )}
          {task.isAutoScheduled && (
            <HiClock
              className="h-4 w-4 shrink-0 text-purple-500"
              title="Auto-scheduled"
            />
          )}
          {task.scheduleLocked && (
            <HiLockClosed
              className="h-4 w-4 shrink-0 text-amber-500"
              title="Schedule locked"
            />
          )}
          {task.externalTaskId && (
            <HiCloud
              className="h-4 w-4 shrink-0 text-sky-500"
              title={`Synced from ${task.source}`}
            />
          )}
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-2">
        <EditableCell
          task={task}
          field="priority"
          value={task.priority}
          onSave={onInlineEdit}
        />
      </td>
      {/* Energy and Time Preference columns hidden for now - future enhancement */}
      {/* Blocked status */}
      <td className="whitespace-nowrap px-3 py-2 text-sm">
        {task.isBlocked ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-600 dark:text-red-400" title={task.blockedReason || "Blocked"}>
            <HiLockClosed className="h-3 w-3" />
            Blocked
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </td>
      {/* Blocked By (prerequisites) */}
      <td className="overflow-hidden px-3 py-2 text-sm" style={{ maxWidth: 0 }}>
        <DependencyCell
          task={task}
          direction="blockedBy"
          items={task.dependencies?.map((d) => ({
            depId: d.id,
            taskId: d.prerequisite.id,
            title: d.prerequisite.title,
            status: d.prerequisite.status,
          })) || []}
          onRefresh={onInlineEdit}
        />
      </td>
      {/* Blocking (dependents) */}
      <td className="overflow-hidden px-3 py-2 text-sm" style={{ maxWidth: 0 }}>
        <DependencyCell
          task={task}
          direction="blocking"
          items={task.prerequisiteFor?.map((d) => ({
            depId: d.id,
            taskId: d.dependentTask.id,
            title: d.dependentTask.title,
            status: d.dependentTask.status,
          })) || []}
          onRefresh={onInlineEdit}
        />
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-sm text-muted-foreground">
        <EditableCell
          task={task}
          field="dueDate"
          value={task.dueDate}
          onSave={onInlineEdit}
        />
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-sm text-muted-foreground">
        <EditableCell
          task={task}
          field="duration"
          value={task.duration}
          onSave={onInlineEdit}
        />
      </td>
      <td className="whitespace-nowrap px-3 py-2">
        <EditableCell
          task={task}
          field="projectId"
          value={task.projectId}
          onSave={onInlineEdit}
        />
      </td>
      {/* Schedule assignment dropdown */}
      <td className="whitespace-nowrap px-3 py-2">
        <Select
          value={task.scheduleId || "inherit"}
          onValueChange={(value) => {
            onInlineEdit({
              ...task,
              scheduleId: value === "inherit" ? null : value,
            } as Task);
          }}
        >
          <SelectTrigger className="h-7 w-full border-none bg-transparent px-1 text-xs shadow-none">
            <span className="flex items-center gap-1.5">
              {(() => {
                const sched = schedules.find((s) => s.id === task.scheduleId);
                if (sched) {
                  return (
                    <>
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: sched.color || "#6b7280" }}
                      />
                      {sched.name}
                    </>
                  );
                }
                return <span className="text-muted-foreground">Inherit</span>;
              })()}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inherit">Inherit from project</SelectItem>
            {schedules.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}{s.isSystem ? " (System)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      {/* Auto-scheduled info */}
      <td className="whitespace-nowrap px-3 py-2">
        <div className="flex items-center gap-2">
          {task.isAutoScheduled ? (
            <div className="flex items-center gap-1">
              <HiClock
                className="h-4 w-4 text-primary"
                title="Auto-scheduled"
              />
              {task.scheduleLocked && (
                <HiLockClosed
                  className="h-3 w-3 text-primary"
                  title="Schedule locked"
                />
              )}
              {task.scheduledStart && task.scheduledEnd && (
                <span className="text-sm text-primary">
                  {format(newDate(task.scheduledStart), "MMM d, p")} -{" "}
                  {format(newDate(task.scheduledEnd), "p")}
                  {task.scheduleScore && (
                    <span className="ml-1 text-primary/70">
                      ({Math.round(task.scheduleScore * 100)}%)
                    </span>
                  )}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Manual</span>
          )}
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-sm text-muted-foreground">
        <EditableCell
          task={task}
          field="startDate"
          value={task.startDate}
          onSave={onInlineEdit}
        />
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right text-sm font-medium">
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-1 text-muted-foreground hover:bg-muted hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            title="Edit task"
          >
            <HiPencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            title="Delete task"
          >
            <HiTrash className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
