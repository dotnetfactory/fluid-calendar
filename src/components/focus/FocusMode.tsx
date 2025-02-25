"use client";

import { useEffect } from "react";
import { useFocusModeStore } from "@/store/focusMode";
import { TaskQueue } from "./TaskQueue";
import { FocusedTask } from "./FocusedTask";
import { QuickActions } from "./QuickActions";
import { logger } from "@/lib/logger";
import { ActionOverlay } from "@/components/ui/action-overlay";

export function FocusMode() {
  // Add hydration safety
  const {
    getCurrentTask,
    getQueuedTasks,
    getQueuedTaskIds,
    currentTaskId,
    isProcessing,
    actionType,
    actionMessage,
    stopProcessing,
  } = useFocusModeStore();

  // Get current task and queued tasks
  const currentTask = getCurrentTask();
  const queuedTasks = getQueuedTasks();
  const queuedTaskIds = getQueuedTaskIds();

  // If currentTaskId exists but getCurrentTask returns null, we need to update the currentTaskId
  useEffect(() => {
    if (currentTaskId && !currentTask && queuedTasks.length > 0) {
      logger.info(
        "[FocusMode] Current task not available, updating currentTaskId",
        {
          oldCurrentTaskId: currentTaskId,
          newCurrentTaskId: queuedTasks[0].id,
        }
      );

      useFocusModeStore.setState({
        currentTaskId: queuedTasks[0].id,
      });
    }
  }, [currentTaskId, currentTask, queuedTasks]);

  logger.debug("[FocusMode] Rendering with tasks:", {
    hasCurrentTask: !!currentTask,
    queuedTasksCount: queuedTasks.length,
    currentTaskId,
    queuedTaskIds,
    isProcessing,
    actionType,
  });

  return (
    <div className="flex flex-col h-full">
      {isProcessing && actionType && (
        <ActionOverlay
          type={actionType}
          message={actionMessage || undefined}
          onComplete={stopProcessing}
        />
      )}

      <div className="flex flex-1">
        {/* Left sidebar with queued tasks */}
        <aside className="w-64 border-r border-border h-full">
          <TaskQueue
            tasks={queuedTasks.filter((task) => task.id !== currentTaskId)}
          />
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
