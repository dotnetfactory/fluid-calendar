import { useMemo, useState, useRef, useEffect } from "react";
import { Task, TaskStatus, EnergyLevel, TimePreference } from "@/types/task";
import {
  format,
  isToday,
  isTomorrow,
  isThisWeek,
  isThisYear,
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
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useTaskListViewSettings } from "@/store/taskListViewSettings";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useProjectStore } from "@/store/project";
import { useDraggableTask } from "../dnd/useDragAndDrop";

// Helper function to format enum values for display
const formatEnumValue = (value: string) => {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};
const statusColors = {
  [TaskStatus.TODO]: "bg-yellow-100 text-yellow-800",
  [TaskStatus.IN_PROGRESS]: "bg-blue-100 text-blue-800",
  [TaskStatus.COMPLETED]: "bg-green-100 text-green-800",
};

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
  column: "createdAt" | "dueDate" | "status" | "project";
  label: string;
  currentSort: string;
  direction: "asc" | "desc";
  onSort: (column: "createdAt" | "dueDate" | "status" | "project") => void;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer group ${className}`}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className="text-gray-400">
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
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 px-3 rounded-md border border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500 min-w-[140px] py-0 bg-white flex items-center justify-between gap-2"
      >
        <span className="truncate">
          {value.length === 0
            ? "All Status"
            : value.length === Object.keys(TaskStatus).length
            ? "All Status"
            : `${value.length} selected`}
        </span>
        <HiChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="absolute left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
          <div className="px-3 py-1 border-b border-gray-200 flex justify-between">
            <button
              className="text-xs text-blue-600 hover:text-blue-700"
              onClick={handleSelectAll}
            >
              Select All
            </button>
            <button
              className="text-xs text-blue-600 hover:text-blue-700"
              onClick={handleSelectNone}
            >
              Clear
            </button>
          </div>
          {Object.values(TaskStatus).map((status) => (
            <label
              key={status}
              className="flex items-center px-3 py-1 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3 w-3"
                checked={value.includes(status)}
                onChange={() => handleChange(status)}
              />
              <span className="ml-2 text-sm text-gray-700">
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
    console.log("EditableCell mounted:", { field, value });
    if (isEditing) {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          editRef.current &&
          !editRef.current.contains(event.target as Node) &&
          // Don't handle click-outside for dropdowns
          field !== "energyLevel" &&
          field !== "preferredTime" &&
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
    console.log("EditableCell handleSave:", { field, editValue });
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
    console.log("EditableCell handleClick:", { field });
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
        className="cursor-pointer hover:bg-gray-50 px-1 -mx-1 rounded"
      >
        {field === "title" ? (
          <div>
            <div className="text-sm font-medium text-gray-900">{value}</div>
            {task.description && (
              <div className="text-xs text-gray-500 line-clamp-1">
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
                      backgroundColor: tag.color || "#E5E7EB",
                      color: "#1F2937",
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
                : "text-gray-400 border border-gray-200"
            }`}
          >
            {value ? formatEnumValue(value) : "Set energy"}
          </span>
        ) : field === "preferredTime" ? (
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              value
                ? timePreferenceColors[value as TimePreference]
                : "text-gray-400 border border-gray-200"
            }`}
          >
            {value ? formatEnumValue(value) : "Set time"}
          </span>
        ) : field === "duration" ? (
          <span
            className={`text-sm ${value ? "text-gray-500" : "text-gray-400"}`}
          >
            {value ? `${value}m` : "Set duration"}
          </span>
        ) : field === "dueDate" ? (
          <span
            className={`text-sm group flex items-center gap-1 ${
              value
                ? formatContextualDate(new Date(value)).isOverdue
                  ? "text-red-600"
                  : "text-gray-500"
                : "text-gray-400"
            }`}
          >
            {value ? (
              <>
                {formatContextualDate(new Date(value)).text}
                {formatContextualDate(new Date(value)).isOverdue && (
                  <HiExclamation className="h-4 w-4 text-red-600" />
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
                  style={{ backgroundColor: task.project.color || "#E5E7EB" }}
                />
                <span className="text-sm text-gray-900">
                  {task.project.name}
                </span>
              </>
            ) : (
              <span className="text-sm text-gray-400">No project</span>
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
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          autoFocus
        />
      ) : field === "energyLevel" ? (
        <DropdownMenu.Root open={isEditing} onOpenChange={setIsEditing}>
          <DropdownMenu.Trigger className="block rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm min-w-[140px] px-3 py-1.5 text-left">
            {editValue ? formatEnumValue(editValue) : "No Energy Level"}
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="bg-white rounded-lg shadow-lg py-1 min-w-[140px] z-50">
              <DropdownMenu.Item
                className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  setEditValue(null);
                  onSave({ ...task, [field]: null });
                  setIsEditing(false);
                }}
              >
                No Energy Level
              </DropdownMenu.Item>
              {Object.values(EnergyLevel).map((level) => (
                <DropdownMenu.Item
                  key={level}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    onSave({ ...task, [field]: level });
                    setIsEditing(false);
                  }}
                >
                  {formatEnumValue(level)}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      ) : field === "preferredTime" ? (
        <DropdownMenu.Root open={isEditing} onOpenChange={setIsEditing}>
          <DropdownMenu.Trigger className="block rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm min-w-[140px] px-3 py-1.5 text-left">
            {editValue ? formatEnumValue(editValue) : "No Time Preference"}
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="bg-white rounded-lg shadow-lg py-1 min-w-[140px] z-50">
              <DropdownMenu.Item
                className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  setEditValue(null);
                  onSave({ ...task, [field]: null });
                  setIsEditing(false);
                }}
              >
                No Time Preference
              </DropdownMenu.Item>
              {Object.values(TimePreference).map((time) => (
                <DropdownMenu.Item
                  key={time}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    onSave({ ...task, [field]: time });
                    setIsEditing(false);
                  }}
                >
                  {formatEnumValue(time)}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      ) : field === "duration" ? (
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={editValue || ""}
            onChange={(e) =>
              setEditValue(e.target.value ? parseInt(e.target.value) : null)
            }
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm max-w-[70px]"
            placeholder="Duration in minutes"
            min="1"
            autoFocus
          />
        </div>
      ) : field === "dueDate" ? (
        <div className="flex items-center gap-1">
          <DatePicker
            selected={
              editValue
                ? new Date(
                    new Date(editValue).getUTCFullYear(),
                    new Date(editValue).getUTCMonth(),
                    new Date(editValue).getUTCDate()
                  )
                : null
            }
            onChange={(date) => {
              if (date) {
                // Create a UTC date at midnight
                const utcDate = new Date(
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
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            dateFormat="yyyy-MM-dd"
            isClearable
          />
        </div>
      ) : field === "projectId" ? (
        <DropdownMenu.Root open={isEditing} onOpenChange={setIsEditing}>
          <DropdownMenu.Trigger className="block rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm min-w-[140px] px-3 py-1.5 text-left">
            {task.project ? (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: task.project.color || "#E5E7EB" }}
                />
                <span>{task.project.name}</span>
              </div>
            ) : (
              "No project"
            )}
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="bg-white rounded-lg shadow-lg py-1 min-w-[140px] z-50">
              <DropdownMenu.Item
                className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  console.log("Setting project to null");
                  onSave({ ...task, projectId: null });
                  setIsEditing(false);
                }}
              >
                No project
              </DropdownMenu.Item>
              {projects.map((project) => (
                <DropdownMenu.Item
                  key={project.id}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    console.log("Setting project to:", project.id);
                    onSave({ ...task, projectId: project.id });
                    setIsEditing(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: project.color || "#E5E7EB" }}
                    />
                    <span>{project.name}</span>
                  </div>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      ) : null}
      {field === "title" && (
        <>
          <button
            type="button"
            onClick={handleSave}
            className="p-1 text-green-600 hover:text-green-700"
          >
            <HiCheck className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="p-1 text-red-600 hover:text-red-700"
          >
            <HiX className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}

// Helper functions
const formatContextualDate = (date: Date) => {
  // For UTC midnight dates (e.g. 2025-03-10T00:00:00.000Z),
  // just use the date components to create a local date
  const localDate = new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
  const now = new Date();
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
    <tr className={`hover:bg-gray-50 ${isDragging ? "opacity-50" : ""}`}>
      <td className="w-8 px-3 py-2 whitespace-nowrap">
        <div {...draggableProps} className="cursor-grab hover:text-gray-700">
          <HiMenuAlt4 className="h-4 w-4 text-gray-400" />
        </div>
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <select
            value={task.status}
            onChange={(e) =>
              onStatusChange(task.id, e.target.value as TaskStatus)
            }
            className={`text-sm border rounded-md px-2 py-1 w-full min-w-[120px] ${
              statusColors[task.status]
            }`}
          >
            {Object.values(TaskStatus).map((status) => (
              <option key={status} value={status}>
                {formatEnumValue(status)}
              </option>
            ))}
          </select>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(
                task.id,
                task.status === TaskStatus.COMPLETED
                  ? TaskStatus.TODO
                  : TaskStatus.COMPLETED
              );
            }}
            className={`p-1 rounded-md transition-colors ${
              task.status === TaskStatus.COMPLETED
                ? "bg-green-100 text-green-700"
                : "hover:bg-gray-100 text-gray-400 hover:text-green-600"
            }`}
            title={
              task.status === TaskStatus.COMPLETED
                ? "Mark as todo"
                : "Mark as completed"
            }
          >
            <HiCheck className="h-5 w-5" />
          </button>
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          {task.isRecurring && (
            <HiRefresh
              className="h-4 w-4 text-blue-500 flex-shrink-0"
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
      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
        <EditableCell
          task={task}
          field="dueDate"
          value={task.dueDate}
          onSave={onInlineEdit}
        />
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
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
                className="h-4 w-4 text-blue-600"
                title="Auto-scheduled"
              />
              {task.scheduleLocked && (
                <HiLockClosed
                  className="h-3 w-3 text-blue-600"
                  title="Schedule locked"
                />
              )}
              {task.scheduledStart && task.scheduledEnd && (
                <span className="text-sm text-blue-600">
                  {format(new Date(task.scheduledStart), "p")} -{" "}
                  {format(new Date(task.scheduledEnd), "p")}
                  {task.scheduleScore && (
                    <span className="ml-1 text-blue-500">
                      ({Math.round(task.scheduleScore * 100)}%)
                    </span>
                  )}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-gray-400">Manual</span>
          )}
        </div>
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center gap-1">
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
        case "dueDate":
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return (
            direction *
            (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
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
            (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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

        <select
          value={energyLevel?.[0] || ""}
          onChange={(e) =>
            setFilters({
              energyLevel: e.target.value
                ? [e.target.value as EnergyLevel]
                : undefined,
            })
          }
          className="h-9 rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500 min-w-[140px] py-0"
        >
          <option value="">All Energy</option>
          {Object.values(EnergyLevel).map((level) => (
            <option key={level} value={level}>
              {formatEnumValue(level)}
            </option>
          ))}
        </select>

        <select
          value={timePreference?.[0] || ""}
          onChange={(e) =>
            setFilters({
              timePreference: e.target.value
                ? [e.target.value as TimePreference]
                : undefined,
            })
          }
          className="h-9 rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500 min-w-[140px] py-0"
        >
          <option value="">All Times</option>
          {Object.values(TimePreference).map((time) => (
            <option key={time} value={time}>
              {formatEnumValue(time)}
            </option>
          ))}
        </select>

        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={search || ""}
            onChange={(e) =>
              setFilters({ search: e.target.value || undefined })
            }
            placeholder="Search tasks..."
            className="h-9 flex-1 min-w-[200px] rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500 py-0"
          />
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="h-9 px-3 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md border border-gray-300 flex items-center gap-1"
            >
              <HiX className="h-4 w-4" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white border border-gray-200 rounded-lg">
        <div className="overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th
                  scope="col"
                  className="w-8 px-3 py-2 text-left text-xs font-medium text-gray-500"
                >
                  {/* Drag handle column */}
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32"
                >
                  Status
                </th>
                <SortableHeader
                  column="createdAt"
                  label="Title"
                  currentSort={sortBy}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32"
                >
                  Energy
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32"
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
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20"
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
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Schedule
                </th>
                <th scope="col" className="relative px-3 py-2 w-10">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
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
            <div className="text-center py-8 text-gray-500 text-sm">
              No tasks found. Try adjusting your filters or create a new task.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
