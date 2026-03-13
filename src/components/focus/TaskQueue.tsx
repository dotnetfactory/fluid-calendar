"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { format, isBefore, newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

import { useFocusModeStore } from "@/store/focusMode";
import { useTaskStore } from "@/store/task";

import { Task, TaskStatus } from "@/types/task";

export function TaskQueue() {
  const { switchToTask, currentTaskId, getQueuedTasks } = useFocusModeStore();
  const { tasks } = useTaskStore();

  // State to track expanded sections
  const [expandedSections, setExpandedSections] = useState<{
    queued: boolean;
    pastDue: boolean;
    postponed: boolean;
    completed: boolean;
  }>({
    queued: false,
    pastDue: false,
    postponed: false,
    completed: false,
  });

  // Get all tasks (including current task)
  const allTasks = tasks;

  // Queued tasks: get from focus mode store
  const queuedTasks = getQueuedTasks();

  // Past due tasks: not completed, due date in the past, not postponed
  const pastDueTasks = allTasks
    .filter(
      (task) =>
        task.status !== TaskStatus.COMPLETED &&
        task.dueDate &&
        isBefore(newDate(task.dueDate), newDate()) &&
        !task.postponedUntil
    )
    .sort((a, b) => {
      // Sort by due date (oldest first)
      const dateA = a.dueDate ? newDate(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? newDate(b.dueDate).getTime() : 0;
      return dateA - dateB;
    });

  // Postponed tasks: not completed, postponed until future
  const postponedTasks = allTasks
    .filter(
      (task) =>
        task.status !== TaskStatus.COMPLETED &&
        task.postponedUntil &&
        isBefore(newDate(), newDate(task.postponedUntil))
    )
    .sort((a, b) => {
      // Sort by postponed until date (earliest first)
      const dateA = a.postponedUntil ? newDate(a.postponedUntil).getTime() : 0;
      const dateB = b.postponedUntil ? newDate(b.postponedUntil).getTime() : 0;
      return dateA - dateB;
    });

  // Recently completed tasks: completed, sorted by completion date (newest first)
  const recentlyCompletedTasks = allTasks
    .filter((task) => task.status === TaskStatus.COMPLETED && task.completedAt)
    .sort((a, b) => {
      const dateA = a.completedAt ? newDate(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? newDate(b.completedAt).getTime() : 0;
      return dateB - dateA; // Descending order (newest first)
    });

  logger.debug("[TaskQueue] Rendering with tasks:", {
    queuedCount: queuedTasks.length,
    pastDueCount: pastDueTasks.length,
    postponedCount: postponedTasks.length,
    recentlyCompletedCount: recentlyCompletedTasks.length,
    currentTaskId,
  });

  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Render a task button
  const renderTaskButton = (task: Task) => (
    <Button
      key={task.id}
      variant="ghost"
      className={cn(
        "h-auto w-full justify-start px-3 py-2",
        "hover:bg-accent hover:text-accent-foreground",
        task.id === currentTaskId &&
          "bg-accent font-medium text-accent-foreground"
      )}
      onClick={() => switchToTask(task.id)}
    >
      <div className="flex w-full flex-col items-start text-left">
        <div className="flex w-full items-center justify-between">
          <span
            className={cn(
              "truncate font-medium",
              task.id === currentTaskId && "text-accent-foreground",
              "task-title"
            )}
          >
            {task.title}
          </span>

          {/* Compact metadata display */}
          <div className="ml-1 flex shrink-0 items-center space-x-1">
            {task.status !== TaskStatus.COMPLETED && task.dueDate && (
              <span className="rounded bg-red-200 px-1.5 py-0.5 text-xs font-medium text-red-900 dark:bg-red-900/50 dark:text-red-100">
                {format(task.dueDate, "MM/dd")}
              </span>
            )}

            {task.postponedUntil &&
              newDate(task.postponedUntil) > newDate() && (
                <span className="rounded bg-amber-200 px-1.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">
                  {format(task.postponedUntil, "MM/dd")}
                </span>
              )}

            {task.status === TaskStatus.COMPLETED && task.completedAt && (
              <span className="rounded bg-green-200 px-1.5 py-0.5 text-xs font-medium text-green-900 dark:bg-green-900/50 dark:text-green-100">
                ✓
              </span>
            )}
          </div>
        </div>
      </div>
    </Button>
  );

  // Render a section with a title and tasks
  const renderSection = (
    title: string,
    sectionTasks: Task[],
    sectionKey: keyof typeof expandedSections,
    accentColor: string
  ) => {
    if (sectionTasks.length === 0) return null;

    const isExpanded = expandedSections[sectionKey];
    const displayTasks = isExpanded ? sectionTasks : sectionTasks.slice(0, 3);
    const hasMore = sectionTasks.length > 3;

    return (
      <div className="mb-4">
        <h3
          className={cn(
            "mb-1 rounded-md px-3 py-1 text-xs font-medium",
            accentColor
          )}
        >
          {title} ({sectionTasks.length})
        </h3>
        <div className="flex flex-col space-y-1">
          {displayTasks.map(renderTaskButton)}

          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => toggleSection(sectionKey)}
            >
              {isExpanded
                ? "Show less"
                : `Show ${sectionTasks.length - 3} more`}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden p-3">
      <div className="flex flex-col space-y-2 overflow-y-auto">
        {renderSection(
          "Top Tasks",
          queuedTasks,
          "queued",
          "bg-blue-500/10 text-blue-700 dark:text-blue-400"
        )}
        {renderSection(
          "Past Due",
          pastDueTasks,
          "pastDue",
          "bg-red-500/10 text-red-700 dark:text-red-400"
        )}
        {renderSection(
          "Postponed",
          postponedTasks,
          "postponed",
          "bg-amber-500/10 text-amber-700 dark:text-amber-400"
        )}
        {renderSection(
          "Recently Completed",
          recentlyCompletedTasks,
          "completed",
          "bg-green-500/10 text-green-700 dark:text-green-400"
        )}

        {queuedTasks.length === 0 &&
          pastDueTasks.length === 0 &&
          postponedTasks.length === 0 &&
          recentlyCompletedTasks.length === 0 && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              No tasks available
            </div>
          )}
      </div>
    </div>
  );
}
