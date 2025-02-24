"use client";

import { useEffect, useState } from "react";
import { useFocusModeStore } from "@/store/focusMode";
import { FocusHeader } from "./FocusHeader";
import { TaskQueue } from "./TaskQueue";
import { FocusedTask } from "./FocusedTask";
import { QuickActions } from "./QuickActions";
import { FocusStatus } from "@/types/focus";
import { logger } from "@/lib/logger";
import { useTaskStore } from "@/store/task";
import { useRouter } from "next/navigation";

export function FocusMode() {
  const router = useRouter();
  // Add hydration safety
  const [isClient, setIsClient] = useState(false);
  const {
    getStatus,
    getCurrentTask,
    getQueuedTasks,
    isActive,
    currentTaskId,
    queuedTaskIds,
    endFocusMode,
  } = useFocusModeStore();
  const { tasks } = useTaskStore();

  // Handle hydration
  useEffect(() => {
    setIsClient(true);

    // Check if we have a valid focus session after hydration
    const status = getStatus();
    const currentTask = getCurrentTask();
    logger.debug("[FocusMode] Component mounted, focus status:", {
      status,
      hasCurrentTask: !!currentTask,
      currentTaskId,
      queuedTaskIds,
      tasksCount: tasks.length,
    });

    // If we have an active focus mode but no current task and no queued tasks,
    // it means we lost our task references. End the focus mode.
    if (isActive && !currentTask && queuedTaskIds.length === 0) {
      logger.warn(
        "[FocusMode] Focus mode is active but no tasks available, ending focus mode"
      );
      endFocusMode();
      router.push("/");
    }
  }, [
    getStatus,
    getCurrentTask,
    isActive,
    currentTaskId,
    queuedTaskIds,
    tasks.length,
    endFocusMode,
    router,
  ]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Add keyboard shortcut handling here
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Don't render anything during SSR to prevent hydration mismatch
  if (!isClient) {
    return <div className="h-full"></div>;
  }

  const status = getStatus();
  const currentTask = getCurrentTask();
  const queuedTasks = getQueuedTasks();

  if (status === FocusStatus.INACTIVE) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      <FocusHeader />

      <div className="flex flex-1">
        {/* Left sidebar with queued tasks */}
        <aside className="w-64 border-r border-border h-full">
          <TaskQueue tasks={queuedTasks} />
        </aside>

        {/* Main content area */}
        <main className="flex-1 p-8 overflow-y-auto">
          <FocusedTask task={currentTask} />
        </main>

        {/* Right sidebar with quick actions */}
        <aside className="w-64 border-l border-border h-full">
          <QuickActions />
        </aside>
      </div>
    </div>
  );
}
