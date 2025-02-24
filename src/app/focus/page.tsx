"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFocusModeStore } from "@/store/focusMode";
import { FocusMode } from "@/components/focus/FocusMode";
import { useTaskStore } from "@/store/task";
import { logger } from "@/lib/logger";
import { FocusTask } from "@/types/focus";
import { TaskStatus } from "@/types/task";
import { newDate } from "@/lib/date-utils";

export default function FocusModePage() {
  const router = useRouter();
  const { startFocusMode, refreshTasks } = useFocusModeStore();
  const { tasks, loading, fetchTasks } = useTaskStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const [tasksLoaded, setTasksLoaded] = useState(false);

  // Mark hydration complete
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Ensure tasks are loaded
  useEffect(() => {
    const loadTasks = async () => {
      if (isHydrated && !tasksLoaded) {
        logger.info("[FocusMode] Loading tasks");
        await fetchTasks();
        setTasksLoaded(true);
      }
    };

    loadTasks();
  }, [isHydrated, tasksLoaded, fetchTasks]);

  // Start focus mode when the page loads if not already active
  useEffect(() => {
    // Skip initialization before hydration completes and tasks load
    if (!isHydrated || !tasksLoaded || loading) {
      return;
    }

    const initializeFocusMode = () => {
      logger.info("[FocusMode] Initializing focus mode with", {
        taskCount: tasks.length,
        hasScheduledTasks: tasks.some((t) => t.scheduledStart !== null),
      });

      // Get top 3 tasks by scheduled start time
      const focusTasks = tasks
        .filter(
          (task) =>
            task.status !== TaskStatus.COMPLETED && task.scheduledStart !== null
        )
        .sort((a, b) => {
          if (!a.scheduledStart) return 1;
          if (!b.scheduledStart) return -1;
          return (
            newDate(a.scheduledStart).getTime() -
            newDate(b.scheduledStart).getTime()
          );
        })
        .slice(0, 3)
        .map((task) => ({
          ...task,
          focusScore: task.scheduleScore || 0,
          lastFocusedAt: null,
          focusTimeSpent: 0,
        })) as unknown as FocusTask[];

      if (focusTasks.length > 0) {
        logger.info("[FocusMode] Starting focus mode with tasks", {
          taskCount: focusTasks.length,
          taskIds: focusTasks.map((t) => t.id),
        });
        startFocusMode(focusTasks);
      } else {
        logger.info("[FocusMode] No scheduled tasks available for focus mode");
        router.push("/");
      }
    };

    initializeFocusMode();
  }, [
    tasks,
    router,
    startFocusMode,
    isHydrated,
    tasksLoaded,
    loading,
    refreshTasks,
  ]);

  return (
    <div className="h-full">
      <FocusMode />
    </div>
  );
}
