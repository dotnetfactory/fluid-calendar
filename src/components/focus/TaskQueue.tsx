"use client";

import { useFocusModeStore } from "@/store/focusMode";
import { useTaskStore } from "@/store/task";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Task, TaskStatus } from "@/types/task";
import { newDate, format, isBefore } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { useState } from "react";

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
        "justify-start h-auto py-2 px-3 w-full",
        "hover:bg-accent hover:text-accent-foreground",
        task.id === currentTaskId &&
          "bg-accent text-accent-foreground font-medium"
      )}
      onClick={() => switchToTask(task.id)}
    >
      <div className="flex flex-col items-start text-left w-full">
        <div className="flex justify-between w-full items-center">
          <span
            className={cn(
              "font-medium truncate",
              task.id === currentTaskId && "text-accent-foreground",
              "task-title"
            )}
          >
            {task.title}
          </span>

          {/* Compact metadata display */}
          <div className="flex items-center space-x-1 ml-1 shrink-0">
            {task.status !== TaskStatus.COMPLETED && task.dueDate && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-100 font-medium">
                {format(task.dueDate, "MM/dd")}
              </span>
            )}

            {task.postponedUntil &&
              newDate(task.postponedUntil) > newDate() && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100 font-medium">
                  {format(task.postponedUntil, "MM/dd")}
                </span>
              )}

            {task.status === TaskStatus.COMPLETED && task.completedAt && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-200 text-green-900 dark:bg-green-900/50 dark:text-green-100 font-medium">
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
            "text-xs font-medium mb-1 px-3 py-1 rounded-md",
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
              className="text-xs text-muted-foreground hover:text-foreground py-1 h-auto"
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
    <div className="flex flex-col p-3 h-full overflow-hidden">
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
            <div className="text-sm text-muted-foreground text-center py-4">
              No tasks available
            </div>
          )}
      </div>
    </div>
  );
}
