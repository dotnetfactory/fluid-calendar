import { useEffect, useRef, useState } from "react";

// Import missing functions
import { isThisWeek, isThisYear, isToday, isTomorrow } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { HiCheck, HiExclamation, HiX } from "react-icons/hi";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  createUTCMidnightDate,
  format,
  isFutureDate,
  newDate,
  newDateFromYMD,
} from "@/lib/date-utils";

import { useProjectStore } from "@/store/project";

import { EnergyLevel, Priority, Task, TimePreference } from "@/types/task";

import {
  energyLevelColors,
  formatEnumValue,
  priorityColors,
  timePreferenceColors,
} from "../utils/task-list-utils";

interface EditableCellProps {
  task: Task;
  field: keyof Task;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  onSave: (task: Task) => void;
}

export function EditableCell({
  task,
  field,
  value,
  onSave,
}: EditableCellProps) {
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
        className="-mx-1 cursor-pointer rounded px-1 hover:bg-muted/50"
      >
        {field === "title" ? (
          <div>
            <div className="task-title text-sm font-medium text-foreground">
              {value}
            </div>

            {task.tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {task.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center rounded px-1.5 py-0.5 text-xs"
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
            className={`rounded-full px-2 py-1 text-xs ${
              value
                ? energyLevelColors[value as EnergyLevel]
                : "border border-border text-muted-foreground"
            }`}
          >
            {value ? formatEnumValue(value) : "Set energy"}
          </span>
        ) : field === "preferredTime" ? (
          <span
            className={`rounded-full px-2 py-1 text-xs ${
              value
                ? timePreferenceColors[value as TimePreference]
                : "border border-border text-muted-foreground"
            }`}
          >
            {value ? formatEnumValue(value) : "Set time"}
          </span>
        ) : field === "priority" ? (
          <span
            className={`rounded-full px-2 py-1 text-xs ${
              value
                ? priorityColors[value as Priority]
                : "border border-border text-muted-foreground"
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
            className={`group flex items-center gap-1 text-sm ${
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
        ) : field === "startDate" ? (
          <span
            className={`text-sm ${
              value ? "text-muted-foreground" : "text-muted-foreground/70"
            }`}
          >
            {value
              ? formatContextualDate(newDate(value)).text
              : "Set start date"}
          </span>
        ) : field === "projectId" ? (
          <div className="flex items-center gap-2">
            {task.project ? (
              <>
                <div
                  className="h-3 w-3 rounded-full"
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
        <div className="flex items-center gap-2">
          <DatePicker
            selected={
              editValue
                ? newDateFromYMD(
                    new Date(editValue).getUTCFullYear(),
                    new Date(editValue).getUTCMonth(),
                    new Date(editValue).getUTCDate()
                  )
                : null
            }
            onChange={(date) => {
              // Just update the local state, don't save yet
              setEditValue(date);
            }}
            className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
            dateFormat="MMM d, yyyy"
            isClearable
            autoFocus
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              // Use the date-utils function to create a consistent UTC midnight date
              onSave({
                ...task,
                [field]: createUTCMidnightDate(editValue),
              });
              setIsEditing(false);
            }}
            className="h-8 w-8 p-0 text-green-600 hover:bg-green-500/10 hover:text-green-700"
          >
            <HiCheck className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <HiX className="h-4 w-4" />
          </Button>
        </div>
      ) : field === "startDate" ? (
        <div className="flex items-center gap-2">
          <DatePicker
            selected={
              editValue
                ? newDateFromYMD(
                    new Date(editValue).getUTCFullYear(),
                    new Date(editValue).getUTCMonth(),
                    new Date(editValue).getUTCDate()
                  )
                : null
            }
            onChange={(date) => {
              // Just update the local state, don't save yet
              setEditValue(date);
            }}
            className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
            dateFormat="MMM d, yyyy"
            isClearable
            autoFocus
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              // Use the date-utils function to create a consistent UTC midnight date
              onSave({
                ...task,
                [field]: createUTCMidnightDate(editValue),
              });
              setIsEditing(false);
            }}
            className="h-8 w-8 p-0 text-green-600 hover:bg-green-500/10 hover:text-green-700"
          >
            <HiCheck className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <HiX className="h-4 w-4" />
          </Button>
        </div>
      ) : field === "projectId" ? (
        <Select
          value={editValue || "none"}
          onValueChange={(value) => {
            onSave({ ...task, projectId: value === "none" ? null : value });
            setIsEditing(false);
          }}
        >
          <SelectTrigger className="h-8 min-w-[140px]">
            <SelectValue>
              {task.project ? (
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
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
            <SelectItem value="none">No project</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
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
            className="h-8 w-8 p-0 text-green-600 hover:bg-green-500/10 hover:text-green-700"
          >
            <HiCheck className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
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

  const isOverdue = localDate < now && !isToday(localDate);
  const isFuture = isFutureDate(localDate);
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
  return { text, isOverdue, isFuture };
};
