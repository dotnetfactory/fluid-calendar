"use client";

import { useEffect } from "react";
import { useFocusModeStore } from "@/store/focusMode";
import { FocusHeader } from "./FocusHeader";
import { TaskQueue } from "./TaskQueue";
import { FocusedTask } from "./FocusedTask";
import { QuickActions } from "./QuickActions";
import { FocusStatus } from "@/types/focus";

export function FocusMode() {
  const { getStatus, getCurrentTask, getQueuedTasks } = useFocusModeStore();
  const status = getStatus();
  const currentTask = getCurrentTask();
  const queuedTasks = getQueuedTasks();

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

  if (status === FocusStatus.INACTIVE) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <FocusHeader />

      <div className="flex-1 flex">
        {/* Left sidebar with queued tasks */}
        <aside className="w-64 border-r border-border p-4">
          <TaskQueue tasks={queuedTasks} />
        </aside>

        {/* Main content area */}
        <main className="flex-1 p-8">
          <FocusedTask task={currentTask} />
        </main>

        {/* Right sidebar with quick actions */}
        <aside className="w-64 border-l border-border p-4">
          <QuickActions />
        </aside>
      </div>
    </div>
  );
}
