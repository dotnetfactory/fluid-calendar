"use client";

import { useEffect, useState } from "react";
import { useFocusModeStore } from "@/store/focusMode";
import { TaskQueue } from "./TaskQueue";
import { FocusedTask } from "./FocusedTask";
import { QuickActions } from "./QuickActions";
import { ActionOverlay } from "@/components/ui/action-overlay";

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
      <div className="flex flex-col h-full items-center justify-center">
        <p className="text-lg text-muted-foreground">Loading focus mode...</p>
      </div>
    );
  }

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
        <aside className="w-80 border-r border-border h-full">
          <TaskQueue />
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
