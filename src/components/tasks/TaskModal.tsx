import { useState, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { IoClose } from "react-icons/io5";
import { cn } from "@/lib/utils";
import {
  Task,
  NewTask,
  TaskStatus,
  EnergyLevel,
  TimePreference,
  Tag,
  Priority,
} from "@/types/task";
import { useProjectStore } from "@/store/project";
import { RRule } from "rrule";
import { Switch } from "@/components/ui/switch";
import { format, newDate } from "@/lib/date-utils";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: NewTask) => Promise<void>;
  task?: Task;
  tags: Tag[];
  onCreateTag: (name: string, color?: string) => Promise<Tag>;
}
//TODO: move to utils
const formatEnumValue = (value: string) => {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};
export function TaskModal({
  isOpen,
  onClose,
  onSave,
  task,
  tags,
  onCreateTag,
}: TaskModalProps) {
  const { projects } = useProjectStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [dueDate, setDueDate] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | "">("");
  const [preferredTime, setPreferredTime] = useState<TimePreference | "">("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#E5E7EB");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectId, setProjectId] = useState<string | null | undefined>(
    task?.projectId
  );
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<string | undefined>();
  const [isAutoScheduled, setIsAutoScheduled] = useState(
    task?.isAutoScheduled || false
  );
  const [scheduleLocked, setScheduleLocked] = useState(
    task?.scheduleLocked || false
  );
  const [priority, setPriority] = useState<Priority | null>(
    task?.priority || null
  );
  const titleInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus(TaskStatus.TODO);
    setDueDate("");
    setDuration("");
    setEnergyLevel("");
    setPreferredTime("");
    setSelectedTagIds([]);
    setNewTagName("");
    setNewTagColor("#E5E7EB");
    setProjectId(null);
    setIsRecurring(false);
    setRecurrenceRule(undefined);
    setIsAutoScheduled(true);
    setScheduleLocked(false);
    setPriority(null);
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Populate form with task data when editing
  useEffect(() => {
    if (task && isOpen) {
      setTitle(task.title);
      setDescription(task.description || "");
      setStatus(task.status);
      // Handle date string from API
      if (task.dueDate) {
        const date = newDate(task.dueDate);
        setDueDate(date.toISOString().split("T")[0]);
      } else {
        setDueDate("");
      }
      setDuration(task.duration?.toString() || "");
      setEnergyLevel(task.energyLevel || "");
      setPreferredTime(task.preferredTime || "");
      setSelectedTagIds(task.tags.map((t) => t.id));
      setProjectId(task.projectId || null);
      setIsRecurring(task.isRecurring);
      setRecurrenceRule(task.recurrenceRule || undefined);
      setIsAutoScheduled(task.isAutoScheduled);
      setScheduleLocked(task.scheduleLocked);
      setPriority(task.priority || null);
    } else if (!task && isOpen) {
      resetForm();
    }
  }, [task, isOpen]);

  // Focus title input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        dueDate: dueDate ? newDate(dueDate) : undefined,
        duration: duration ? parseInt(duration, 10) : undefined,
        energyLevel: energyLevel || undefined,
        preferredTime: preferredTime || undefined,
        tagIds: selectedTagIds,
        projectId: projectId,
        isRecurring,
        recurrenceRule: isRecurring ? recurrenceRule : undefined,
        isAutoScheduled,
        scheduleLocked,
        priority,
      });
      onClose();
    } catch (error) {
      console.error("Error saving task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      const tag = await onCreateTag(newTagName.trim(), newTagColor);
      setSelectedTagIds([...selectedTagIds, tag.id]);
      setNewTagName("");
      setNewTagColor("#E5E7EB");
    } catch (error) {
      console.error("Error creating tag:", error);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg z-[10000]">
          {isSubmitting && <LoadingOverlay />}
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">
              {task ? "Edit Task" : "New Task"}
            </Dialog.Title>
            <Dialog.Close className="rounded-full p-1.5 hover:bg-gray-100">
              <IoClose className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700"
              >
                Title
              </label>
              <input
                type="text"
                id="title"
                ref={titleInputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-gray-700"
                >
                  Status
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  {Object.values(TaskStatus).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="dueDate"
                  className="block text-sm font-medium text-gray-700"
                >
                  Due Date
                </label>
                <input
                  type="date"
                  id="dueDate"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="duration"
                  className="block text-sm font-medium text-gray-700"
                >
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min="0"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="priority"
                  className="block text-sm font-medium text-gray-700"
                >
                  Priority
                </label>
                <select
                  id="priority"
                  value={priority || Priority.NONE}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  {Object.values(Priority).map((level) => (
                    <option key={level} value={level}>
                      {formatEnumValue(level)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="energyLevel"
                  className="block text-sm font-medium text-gray-700"
                >
                  Energy Level
                </label>
                <select
                  id="energyLevel"
                  value={energyLevel}
                  onChange={(e) =>
                    setEnergyLevel(e.target.value as EnergyLevel)
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">None</option>
                  {Object.values(EnergyLevel).map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="preferredTime"
                  className="block text-sm font-medium text-gray-700"
                >
                  Preferred Time
                </label>
                <select
                  id="preferredTime"
                  value={preferredTime}
                  onChange={(e) =>
                    setPreferredTime(e.target.value as TimePreference)
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">None</option>
                  {Object.values(TimePreference).map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Auto-Schedule
                  </label>
                  <p className="text-sm text-gray-500">
                    Let the system schedule this task automatically
                  </p>
                </div>
                <Switch
                  checked={isAutoScheduled}
                  onCheckedChange={setIsAutoScheduled}
                />
              </div>

              {isAutoScheduled && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Lock Schedule
                      </label>
                      <p className="text-sm text-gray-500">
                        Prevent automatic rescheduling
                      </p>
                    </div>
                    <Switch
                      checked={scheduleLocked}
                      onCheckedChange={setScheduleLocked}
                    />
                  </div>

                  {task?.scheduledStart && task?.scheduledEnd && (
                    <div className="rounded-md bg-blue-50 p-3">
                      <div className="text-sm text-blue-700">
                        Scheduled for{" "}
                        {format(newDate(task.scheduledStart), "PPp")} to{" "}
                        {format(newDate(task.scheduledEnd), "p")}
                      </div>
                      {task.scheduleScore && (
                        <div className="text-sm text-blue-600 mt-1">
                          Confidence: {Math.round(task.scheduleScore * 100)}%
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <label
                htmlFor="project"
                className="block text-sm font-medium text-gray-700"
              >
                Project
              </label>
              <select
                id="project"
                value={projectId || ""}
                onChange={(e) => setProjectId(e.target.value || null)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">No Project</option>
                {projects
                  .filter((p) => p.status === "active")
                  .map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tags
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <label
                    key={tag.id}
                    className={cn(
                      "inline-flex items-center px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors",
                      selectedTagIds.includes(tag.id)
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selectedTagIds.includes(tag.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTagIds([...selectedTagIds, tag.id]);
                        } else {
                          setSelectedTagIds(
                            selectedTagIds.filter((id) => id !== tag.id)
                          );
                        }
                      }}
                    />
                    <span
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: tag.color || "#E5E7EB" }}
                    />
                    {tag.name}
                  </label>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="New tag name"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="h-9 w-9 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium",
                    "bg-blue-600 text-white hover:bg-blue-700",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  Add Tag
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => {
                    setIsRecurring(e.target.checked);
                    if (e.target.checked) {
                      if (!dueDate) {
                        // If no due date, set to today
                        const today = newDate();
                        setDueDate(today.toISOString().split("T")[0]);
                      }
                      if (!recurrenceRule) {
                        // Set default weekly recurrence on Monday when enabling
                        setRecurrenceRule(
                          new RRule({
                            freq: RRule.WEEKLY,
                            interval: 1,
                            byweekday: [RRule.MO],
                          }).toString()
                        );
                      }
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Make this a recurring task
                </span>
              </label>
              {isRecurring && !dueDate && (
                <div className="text-sm text-blue-600 mt-1 ml-6">
                  A recurring task needs a start date. Today has been set as the
                  default.
                </div>
              )}
              {isRecurring && (
                <div className="mt-2 space-y-3 pl-6">
                  <div>
                    <label className="block text-sm text-gray-600">
                      Repeat every
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={
                          recurrenceRule
                            ? RRule.fromString(recurrenceRule).options
                                .interval || 1
                            : 1
                        }
                        onChange={(e) => {
                          const interval = parseInt(e.target.value) || 1;
                          const currentRule = recurrenceRule
                            ? RRule.fromString(recurrenceRule)
                            : new RRule({
                                freq: RRule.WEEKLY,
                                interval: 1,
                                byweekday: [RRule.MO],
                              });
                          setRecurrenceRule(
                            new RRule({
                              ...currentRule.options,
                              interval,
                            }).toString()
                          );
                        }}
                        className="w-16 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                      <select
                        value={
                          recurrenceRule
                            ? RRule.fromString(recurrenceRule).options.freq
                            : RRule.WEEKLY
                        }
                        onChange={(e) => {
                          const freq = parseInt(e.target.value);
                          const currentRule = recurrenceRule
                            ? RRule.fromString(recurrenceRule)
                            : new RRule({
                                freq: RRule.WEEKLY,
                                interval: 1,
                                byweekday: [RRule.MO],
                              });
                          setRecurrenceRule(
                            new RRule({
                              ...currentRule.options,
                              freq,
                              // Always set Monday for weekly recurrence
                              byweekday:
                                freq === RRule.WEEKLY ? [RRule.MO] : null,
                            }).toString()
                          );
                        }}
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        <option value={RRule.DAILY}>days</option>
                        <option value={RRule.WEEKLY}>weeks</option>
                        <option value={RRule.MONTHLY}>months</option>
                        <option value={RRule.YEARLY}>years</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium",
                  "text-gray-700 hover:bg-gray-100",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                )}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium",
                  "bg-blue-600 text-white hover:bg-blue-700",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isSubmitting ? "Saving..." : task ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
