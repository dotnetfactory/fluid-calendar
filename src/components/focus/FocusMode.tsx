"use client";

import { useEffect, useState } from "react";

import { ActionOverlay } from "@/components/ui/action-overlay";

import { useFocusModeStore } from "@/store/focusMode";

import { FocusedTask } from "./FocusedTask";
import { QuickActions } from "./QuickActions";
import { TaskQueue } from "./TaskQueue";

export function FocusMode() {
  const [mounted, setMounted] = useState(false);

  // Add hydration safety
  const {
    getCurrentTask,
    isProcessing,
    actionType,
    actionMessage,
    stopProcessing,
  } = useFocusModeStore();

  // Get current task and queued tasks - do this before any conditional returns
  const currentTask = getCurrentTask();

  // This effect will only run on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  // If not mounted yet, render a simple loading state
  if (!mounted) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <p className="text-lg text-muted-foreground">Loading focus mode...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {isProcessing && actionType && (
        <ActionOverlay
          type={actionType}
          message={actionMessage || undefined}
          onComplete={stopProcessing}
        />
      )}

      <div className="flex flex-1">
        {/* Left sidebar with queued tasks */}
        <aside className="h-full w-80 border-r border-border">
          <TaskQueue />
        </aside>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-8">
          <FocusedTask task={currentTask} />
        </main>

        {/* Right sidebar with quick actions */}
        <aside className="h-full w-64 border-l border-border">
          <QuickActions />
        </aside>
      </div>
    </div>
  );
}
