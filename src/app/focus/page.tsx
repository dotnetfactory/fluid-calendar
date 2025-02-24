"use client";

import { useEffect } from "react";
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
  const { isActive, startFocusMode } = useFocusModeStore();
  const { tasks } = useTaskStore();

  // Start focus mode when the page loads if not already active
  useEffect(() => {
    const initializeFocusMode = () => {
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
          externalTaskId: task.id,
          source: "local",
          lastSyncedAt: newDate(),
        })) as unknown as FocusTask[];

      if (focusTasks.length > 0) {
        logger.info("[FocusMode] Starting focus mode with tasks", {
          taskCount: focusTasks.length,
        });
        startFocusMode(focusTasks);
      } else {
        logger.info("[FocusMode] No scheduled tasks available for focus mode");
        router.push("/");
      }
    };

    // Only initialize if we're not already in focus mode
    if (!isActive) {
      initializeFocusMode();
    }
  }, [tasks, router, startFocusMode, isActive]);

  return (
    <div className="h-full">
      <FocusMode />
    </div>
  );
}
