import { useMemo } from "react";
import { Task, TaskStatus, EnergyLevel, TimePreference } from "@/types/task";
import { newDate } from "@/lib/date-utils";
import { useTaskListViewSettings } from "@/store/taskListViewSettings";
import { useProjectStore } from "@/store/project";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HiX } from "react-icons/hi";
import { SortableHeader, StatusFilter, TaskRow } from "./components";
import { formatEnumValue } from "./utils/task-list-utils";

interface TaskListProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onInlineEdit: (task: Task) => void;
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
    hideUpcomingTasks,
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
    const now = newDate();

    return projectFilteredTasks.filter((task) => {
      // Status filter
      if (status?.length && !status.includes(task.status)) {
        return false;
      }

      // Hide future tasks
      if (
        hideUpcomingTasks &&
        task.startDate &&
        newDate(task.startDate) > now
      ) {
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
    hideUpcomingTasks,
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
        case "startDate":
          if (!a.startDate) return 1;
          if (!b.startDate) return -1;
          return (
            direction *
            (newDate(a.startDate).getTime() - newDate(b.startDate).getTime())
          );
        case "status":
          return direction * a.status.localeCompare(b.status);
        case "project":
          if (!a.project?.name) return 1;
          if (!b.project?.name) return -1;
          return direction * a.project.name.localeCompare(b.project.name);
        case "priority":
          if (!a.priority) return 1;
          if (!b.priority) return -1;
          return direction * a.priority.localeCompare(b.priority);
        case "energyLevel":
          if (!a.energyLevel) return 1;
          if (!b.energyLevel) return -1;
          return direction * a.energyLevel.localeCompare(b.energyLevel);
        case "preferredTime":
          if (!a.preferredTime) return 1;
          if (!b.preferredTime) return -1;
          return direction * a.preferredTime.localeCompare(b.preferredTime);
        case "duration":
          if (!a.duration) return 1;
          if (!b.duration) return -1;
          return direction * (a.duration - b.duration);
        case "schedule":
          // First sort by auto-scheduled vs manual
          if (a.isAutoScheduled !== b.isAutoScheduled) {
            return direction * (a.isAutoScheduled ? -1 : 1);
          }
          // Then sort by scheduled start time
          if (a.isAutoScheduled && b.isAutoScheduled) {
            if (!a.scheduledStart) return 1;
            if (!b.scheduledStart) return -1;
            return (
              direction *
              (newDate(a.scheduledStart).getTime() -
                newDate(b.scheduledStart).getTime())
            );
          }
          // Default to creation date for manual tasks
          return (
            direction *
            (newDate(b.createdAt).getTime() - newDate(a.createdAt).getTime())
          );
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

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="hideUpcomingTasks"
            checked={hideUpcomingTasks}
            onChange={(e) =>
              setFilters({ hideUpcomingTasks: e.target.checked })
            }
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/80"
          />
          <label htmlFor="hideUpcomingTasks" className="text-sm">
            Hide upcoming tasks
          </label>
        </div>
      </div>

      <div className="flex-1 bg-background border rounded-lg">
        <div
          className="overflow-auto"
          style={{ maxHeight: "calc(100vh - 250px)" }}
        >
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th
                  scope="col"
                  className="w-8 px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                >
                  {/* Drag handle column */}
                </th>
                <SortableHeader
                  column="status"
                  label="Status"
                  currentSort={sortBy}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="w-32"
                />
                <SortableHeader
                  column="title"
                  label="Title"
                  currentSort={sortBy}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  column="priority"
                  label="Priority"
                  currentSort={sortBy}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="w-32"
                />
                <SortableHeader
                  column="energyLevel"
                  label="Energy"
                  currentSort={sortBy}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="w-32"
                />
                <SortableHeader
                  column="preferredTime"
                  label="Time"
                  currentSort={sortBy}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="w-32"
                />
                <SortableHeader
                  column="dueDate"
                  label="Due Date"
                  currentSort={sortBy}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="w-40"
                />
                <SortableHeader
                  column="duration"
                  label="Duration"
                  currentSort={sortBy}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="w-20"
                />
                <SortableHeader
                  column="project"
                  label="Project"
                  currentSort={sortBy}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="w-40"
                />
                <SortableHeader
                  column="schedule"
                  label="Schedule"
                  currentSort={sortBy}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  column="startDate"
                  label="Start Date"
                  currentSort={sortBy}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="w-40"
                />
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
