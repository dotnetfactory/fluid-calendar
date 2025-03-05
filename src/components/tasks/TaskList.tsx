import { useMemo, useState, useRef, useEffect } from "react";
import {
  Task,
  TaskStatus,
  EnergyLevel,
  TimePreference,
  Priority,
} from "@/types/task";
import {
  format,
  isToday,
  isTomorrow,
  isThisWeek,
  isThisYear,
  newDate,
  newDateFromYMD,
} from "@/lib/date-utils";
import {
  HiChevronUp,
  HiChevronDown,
  HiX,
  HiCheck,
  HiExclamation,
  HiPencil,
  HiTrash,
  HiMenuAlt4,
  HiRefresh,
  HiClock,
  HiLockClosed,
} from "react-icons/hi";
import { useTaskListViewSettings } from "@/store/taskListViewSettings";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useProjectStore } from "@/store/project";
import { useDraggableTask } from "../dnd/useDragAndDrop";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Helper function to format enum values for display
const formatEnumValue = (value: string) => {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const statusColors = {
  [TaskStatus.TODO]: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  [TaskStatus.IN_PROGRESS]: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  [TaskStatus.COMPLETED]: "bg-green-500/20 text-green-700 dark:text-green-400",
};

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

const priorityColors = {
  [Priority.HIGH]: "bg-red-500/20 text-red-700 dark:text-red-400",
  [Priority.MEDIUM]: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  [Priority.LOW]: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  [Priority.NONE]: "bg-muted text-muted-foreground",
};

interface TaskListProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onInlineEdit: (task: Task) => void;
}

// Add this component for the sortable header
function SortableHeader({
  column,
  label,
  currentSort,
  direction,
  onSort,
  className = "",
}: {
  column: "title" | "dueDate" | "status" | "project";
  label: string;
  currentSort: string;
  direction: "asc" | "desc";
  onSort: (column: "title" | "dueDate" | "status" | "project") => void;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer group",
        className
      )}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className="text-muted-foreground/50">
          {currentSort === column ? (
            direction === "asc" ? (
              <HiChevronUp className="h-4 w-4" />
            ) : (
              <HiChevronDown className="h-4 w-4" />
            )
          ) : (
            <HiChevronDown className="h-4 w-4 opacity-0 group-hover:opacity-50" />
          )}
        </span>
      </div>
    </th>
  );
}

// Add this component for the multi-select status filter
function StatusFilter({
  value = [],
  onChange,
}: {
  value: TaskStatus[];
  onChange: (value: TaskStatus[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (status: TaskStatus) => {
    const index = value.indexOf(status);
    if (index === -1) {
      onChange([...value, status]);
    } else {
      onChange(value.filter((s) => s !== status));
    }
  };

  const handleSelectAll = () => {
    onChange(Object.values(TaskStatus));
    setIsOpen(false);
  };

  const handleSelectNone = () => {
    onChange([]);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={filterRef}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 px-3 min-w-[140px] justify-between"
      >
        <span className="truncate">
          {value.length === 0
            ? "All Status"
            : value.length === Object.keys(TaskStatus).length
            ? "All Status"
            : `${value.length} selected`}
        </span>
        <HiChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </Button>
      {isOpen && (
        <div className="absolute left-0 mt-1 w-48 bg-background rounded-md shadow-lg border border-border py-1 z-50">
          <div className="px-3 py-1 border-b border-border flex justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-auto p-0 hover:bg-transparent hover:text-primary"
              onClick={handleSelectAll}
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-auto p-0 hover:bg-transparent hover:text-primary"
              onClick={handleSelectNone}
            >
              Clear
            </Button>
          </div>
          {Object.values(TaskStatus).map((status) => (
            <label
              key={status}
              className="flex items-center px-3 py-1.5 hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                checked={value.includes(status)}
                onCheckedChange={() => handleChange(status)}
                className="h-3 w-3"
              />
              <span className="ml-2 text-sm text-foreground">
                {formatEnumValue(status)}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// Add EditableCell component for inline editing
interface EditableCellProps {
  task: Task;
  field: keyof Task;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  onSave: (task: Task) => void;
}

function EditableCell({ task, field, value, onSave }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const editRef = useRef<HTMLDivElement>(null);
  const { projects } = useProjectStore();

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing) {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          editRef.current &&
          !editRef.current.contains(event.target as Node) &&
          // Don't handle click-outside for dropdowns
          field !== "energyLevel" &&
          field !== "preferredTime" &&
          field !== "priority" &&
          field !== "projectId"
        ) {
          setEditValue(value);
          setIsEditing(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isEditing, value, field]);

  const handleSave = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onSave({ ...task, [field]: editValue });
    setIsEditing(false);
  };

  const handleCancel = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditValue(value);
    setIsEditing(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel(e);
    }
  };

  if (!isEditing) {
    return (
      <div
        onClick={handleClick}
        className="cursor-pointer hover:bg-muted/50 px-1 -mx-1 rounded"
      >
        {field === "title" ? (
          <div>
            <div className="text-sm font-medium text-foreground task-title">
              {value}
            </div>
            {task.description && (
              <div className="text-xs text-muted-foreground line-clamp-1 task-description">
                {task.description}
              </div>
            )}
            {task.tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
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
          </div>
        ) : field === "energyLevel" ? (
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              value
                ? energyLevelColors[value as EnergyLevel]
                : "text-muted-foreground border border-border"
            }`}
          >
            {value ? formatEnumValue(value) : "Set energy"}
          </span>
        ) : field === "preferredTime" ? (
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              value
                ? timePreferenceColors[value as TimePreference]
                : "text-muted-foreground border border-border"
            }`}
          >
            {value ? formatEnumValue(value) : "Set time"}
          </span>
        ) : field === "priority" ? (
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              value
                ? priorityColors[value as Priority]
                : "text-muted-foreground border border-border"
            }`}
          >
            {value ? formatEnumValue(value) : "Set priority"}
          </span>
        ) : field === "duration" ? (
          <span
            className={`text-sm ${
              value ? "text-muted-foreground" : "text-muted-foreground/70"
            }`}
          >
            {value ? `${value}m` : "Set duration"}
          </span>
        ) : field === "dueDate" ? (
          <span
            className={`text-sm group flex items-center gap-1 ${
              value
                ? formatContextualDate(newDate(value)).isOverdue
                  ? "text-destructive"
                  : "text-muted-foreground"
                : "text-muted-foreground/70"
            }`}
          >
            {value ? (
              <>
                {formatContextualDate(newDate(value)).text}
                {formatContextualDate(newDate(value)).isOverdue && (
                  <HiExclamation className="h-4 w-4 text-destructive" />
                )}
              </>
            ) : (
              "Set due date"
            )}
          </span>
        ) : field === "projectId" ? (
          <div className="flex items-center gap-2">
            {task.project ? (
              <>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: task.project.color || "var(--muted)",
                  }}
                />
                <span className="text-sm text-foreground">
                  {task.project.name}
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">No project</span>
            )}
          </div>
        ) : (
          value
        )}
      </div>
    );
  }

  return (
    <div
      ref={editRef}
      className="flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      {field === "title" ? (
        <Input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="h-8"
          autoFocus
        />
      ) : field === "energyLevel" ? (
        <Select
          value={editValue || "none"}
          onValueChange={(value) => {
            onSave({
              ...task,
              [field]: value !== "none" ? (value as EnergyLevel) : null,
            });
            setIsEditing(false);
          }}
        >
          <SelectTrigger className="h-8 min-w-[140px]">
            <SelectValue placeholder="No Energy Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Energy Level</SelectItem>
            {Object.values(EnergyLevel).map((level) => (
              <SelectItem key={level} value={level}>
                {formatEnumValue(level)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field === "preferredTime" ? (
        <Select
          value={editValue || "none"}
          onValueChange={(value) => {
            onSave({
              ...task,
              [field]: value !== "none" ? (value as TimePreference) : null,
            });
            setIsEditing(false);
          }}
        >
          <SelectTrigger className="h-8 min-w-[140px]">
            <SelectValue placeholder="No Time Preference" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Time Preference</SelectItem>
            {Object.values(TimePreference).map((time) => (
              <SelectItem key={time} value={time}>
                {formatEnumValue(time)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field === "priority" ? (
        <Select
          value={editValue || "none"}
          onValueChange={(value) => {
            onSave({
              ...task,
              [field]: value !== "none" ? (value as Priority) : null,
            });
            setIsEditing(false);
          }}
        >
          <SelectTrigger className="h-8 min-w-[140px]">
            <SelectValue placeholder="No Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Priority</SelectItem>
            {Object.values(Priority).map((priority) => (
              <SelectItem key={priority} value={priority}>
                {formatEnumValue(priority)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field === "duration" ? (
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={editValue || ""}
            onChange={(e) =>
              setEditValue(e.target.value ? parseInt(e.target.value) : null)
            }
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="h-8 w-20"
            placeholder="Minutes"
            min="1"
            autoFocus
          />
        </div>
      ) : field === "dueDate" ? (
        <div className="flex items-center gap-1">
          <DatePicker
            selected={
              editValue
                ? newDateFromYMD(
                    newDate(editValue).getUTCFullYear(),
                    newDate(editValue).getUTCMonth(),
                    newDate(editValue).getUTCDate()
                  )
                : null
            }
            onChange={(date) => {
              if (date) {
                // Create a UTC date at midnight
                const utcDate = newDate(
                  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
                );
                onSave({ ...task, [field]: utcDate });
              } else {
                onSave({ ...task, [field]: undefined });
              }
              setIsEditing(false);
            }}
            onClickOutside={() => setIsEditing(false)}
            open={isEditing}
            onInputClick={() => {}}
            className="h-8 w-full"
            dateFormat="yyyy-MM-dd"
            isClearable
          />
        </div>
      ) : field === "projectId" ? (
        <Select
          value={editValue || ""}
          onValueChange={(value) => {
            onSave({ ...task, projectId: value || null });
            setIsEditing(false);
          }}
        >
          <SelectTrigger className="h-8 min-w-[140px]">
            <SelectValue>
              {task.project ? (
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: task.project.color || "var(--muted)",
                    }}
                  />
                  <span>{task.project.name}</span>
                </div>
              ) : (
                "No project"
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No project</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: project.color || "var(--muted)" }}
                  />
                  <span>{project.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      {field === "title" && (
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-500/10"
          >
            <HiCheck className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <HiX className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}

// Helper functions
const formatContextualDate = (date: Date) => {
  // For UTC midnight dates (e.g. 2025-03-10T00:00:00.000Z),
  // just use the date components to create a local date
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

// Add TaskRow component outside of TaskList
function TaskRow({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  onInlineEdit,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onInlineEdit: (task: Task) => void;
}) {
  const { draggableProps, isDragging } = useDraggableTask(task);

  return (
    <tr className={`hover:bg-muted/50 ${isDragging ? "opacity-50" : ""}`}>
      <td className="w-8 px-3 py-2 whitespace-nowrap">
        <div {...draggableProps} className="cursor-grab hover:text-foreground">
          <HiMenuAlt4 className="h-4 w-4 text-muted-foreground" />
        </div>
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <Select
            value={task.status}
            onValueChange={(value) =>
              onStatusChange(task.id, value as TaskStatus)
            }
          >
            <SelectTrigger
              className={`h-8 w-[120px] ${statusColors[task.status]}`}
            >
              <SelectValue>{formatEnumValue(task.status)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.values(TaskStatus).map((status) => (
                <SelectItem key={status} value={status}>
                  {formatEnumValue(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "p-1 h-8 w-8",
              task.status === TaskStatus.COMPLETED
                ? "bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/30"
                : "text-muted-foreground hover:text-green-600 hover:bg-muted"
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
          {task.isRecurring && (
            <HiRefresh
              className="h-4 w-4 text-primary flex-shrink-0"
              title="Recurring task"
            />
          )}
          <EditableCell
            task={task}
            field="title"
            value={task.title}
            onSave={onInlineEdit}
          />
        </div>
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <EditableCell
          task={task}
          field="priority"
          value={task.priority}
          onSave={onInlineEdit}
        />
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <EditableCell
          task={task}
          field="energyLevel"
          value={task.energyLevel}
          onSave={onInlineEdit}
        />
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <EditableCell
          task={task}
          field="preferredTime"
          value={task.preferredTime}
          onSave={onInlineEdit}
        />
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-sm text-muted-foreground">
        <EditableCell
          task={task}
          field="dueDate"
          value={task.dueDate}
          onSave={onInlineEdit}
        />
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-sm text-muted-foreground">
        <EditableCell
          task={task}
          field="duration"
          value={task.duration}
          onSave={onInlineEdit}
        />
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <EditableCell
          task={task}
          field="projectId"
          value={task.projectId}
          onSave={onInlineEdit}
        />
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
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
          ) : (
            <span className="text-sm text-muted-foreground">Manual</span>
          )}
        </div>
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="p-1 h-8 w-8 text-muted-foreground hover:text-primary hover:bg-muted"
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
            className="p-1 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-muted"
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

export function TaskList({
  tasks,
  onEdit,
  onDelete,
  onStatusChange,
  onInlineEdit,
}: TaskListProps) {
  const {
    sortBy,
    sortDirection,
    status,
    energyLevel,
    timePreference,
    tagIds,
    search,
    setSortBy,
    setSortDirection,
    setFilters,
    resetFilters,
  } = useTaskListViewSettings();
  const { activeProject } = useProjectStore();

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("desc");
    }
  };

  // First, filter by project
  const projectFilteredTasks = activeProject
    ? activeProject.id === "no-project"
      ? tasks.filter((task) => !task.projectId)
      : tasks.filter((task) => task.projectId === activeProject.id)
    : tasks;

  // Then apply other filters
  const filteredTasks = useMemo(() => {
    return projectFilteredTasks.filter((task) => {
      // Status filter
      if (status?.length && !status.includes(task.status)) {
        return false;
      }

      // Energy level filter
      if (
        energyLevel?.length &&
        (!task.energyLevel || !energyLevel.includes(task.energyLevel))
      ) {
        return false;
      }

      // Time preference filter
      if (
        timePreference?.length &&
        (!task.preferredTime || !timePreference.includes(task.preferredTime))
      ) {
        return false;
      }

      // Tags filter
      if (tagIds?.length) {
        const taskTagIds = task.tags.map((t) => t.id);
        if (!tagIds.some((id) => taskTagIds.includes(id))) {
          return false;
        }
      }

      // Search
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          task.title.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower) ||
          task.tags.some((tag) => tag.name.toLowerCase().includes(searchLower))
        );
      }

      return true;
    });
  }, [
    projectFilteredTasks,
    status,
    energyLevel,
    timePreference,
    tagIds,
    search,
  ]);

  // Apply sorting
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      switch (sortBy) {
        case "title":
          return direction * a.title.localeCompare(b.title);
        case "dueDate":
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return (
            direction *
            (newDate(a.dueDate).getTime() - newDate(b.dueDate).getTime())
          );
        case "status":
          return direction * a.status.localeCompare(b.status);
        case "project":
          if (!a.project?.name) return 1;
          if (!b.project?.name) return -1;
          return direction * a.project.name.localeCompare(b.project.name);
        default:
          return (
            direction *
            (newDate(b.createdAt).getTime() - newDate(a.createdAt).getTime())
          );
      }
    });
  }, [filteredTasks, sortBy, sortDirection]);

  const hasActiveFilters =
    status?.length ||
    energyLevel?.length ||
    timePreference?.length ||
    tagIds?.length ||
    search;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-4">
        <StatusFilter
          value={status || []}
          onChange={(value) => setFilters({ status: value })}
        />

        <Select
          value={energyLevel?.[0] || "none"}
          onValueChange={(value) =>
            setFilters({
              energyLevel:
                value !== "none" ? [value as EnergyLevel] : undefined,
            })
          }
        >
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="All Energy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">All Energy</SelectItem>
            {Object.values(EnergyLevel).map((level) => (
              <SelectItem key={level} value={level}>
                {formatEnumValue(level)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={timePreference?.[0] || "none"}
          onValueChange={(value) =>
            setFilters({
              timePreference:
                value !== "none" ? [value as TimePreference] : undefined,
            })
          }
        >
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="All Times" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">All Times</SelectItem>
            {Object.values(TimePreference).map((time) => (
              <SelectItem key={time} value={time}>
                {formatEnumValue(time)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1 flex gap-2">
          <Input
            value={search || ""}
            onChange={(e) =>
              setFilters({ search: e.target.value || undefined })
            }
            placeholder="Search tasks..."
            className="h-9"
          />
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="h-9"
            >
              <HiX className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-background border rounded-lg">
        <div className="overflow-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th
                  scope="col"
                  className="w-8 px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                >
                  {/* Drag handle column */}
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32"
                >
                  Status
                </th>
                <SortableHeader
                  column="title"
                  label="Title"
                  currentSort={sortBy}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32"
                >
                  Priority
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32"
                >
                  Energy
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32"
                >
                  Time
                </th>
                <SortableHeader
                  column="dueDate"
                  label="Due Date"
                  currentSort={sortBy}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="w-40"
                />
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-20"
                >
                  Duration
                </th>
                <SortableHeader
                  column="project"
                  label="Project"
                  currentSort={sortBy}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="w-40"
                />
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Schedule
                </th>
                <th scope="col" className="relative px-3 py-2 w-10">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-background divide-y divide-border">
              {sortedTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                  onInlineEdit={onInlineEdit}
                />
              ))}
            </tbody>
          </table>
          {sortedTasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No tasks found. Try adjusting your filters or create a new task.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
