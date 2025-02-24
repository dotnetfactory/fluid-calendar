"use client";

import { useFocusModeStore } from "@/store/focusMode";
import { Button } from "@/components/ui/button";
import { FocusStatus } from "@/types/focus";

export function QuickActions() {
  const {
    getStatus,
    pauseFocusMode,
    resumeFocusMode,
    completeCurrentTask,
    queuedTaskIds,
    switchToTask,
  } = useFocusModeStore();
  const status = getStatus();

  return (
    <div className="flex flex-col space-y-4">
      <h2 className="text-lg font-semibold">Quick Actions</h2>

      <div className="flex flex-col space-y-2">
        {/* Pause/Resume */}
        {status === FocusStatus.ACTIVE ? (
          <Button
            variant="outline"
            onClick={() => pauseFocusMode()}
            className="justify-start"
          >
            <span className="flex items-center">
              <span className="mr-2">⏸️</span>
              Pause Focus Mode
            </span>
            <span className="ml-auto text-xs text-muted-foreground">Alt+F</span>
          </Button>
        ) : status === FocusStatus.PAUSED ? (
          <Button
            variant="outline"
            onClick={() => resumeFocusMode()}
            className="justify-start"
          >
            <span className="flex items-center">
              <span className="mr-2">▶️</span>
              Resume Focus Mode
            </span>
            <span className="ml-auto text-xs text-muted-foreground">Alt+R</span>
          </Button>
        ) : null}

        {/* Complete Task */}
        <Button
          variant="outline"
          onClick={() => completeCurrentTask()}
          className="justify-start"
        >
          <span className="flex items-center">
            <span className="mr-2">✅</span>
            Complete Current Task
          </span>
          <span className="ml-auto text-xs text-muted-foreground">Alt+C</span>
        </Button>

        {/* Next Task */}
        {queuedTaskIds.length > 0 && (
          <Button
            variant="outline"
            onClick={() => switchToTask(queuedTaskIds[0])}
            className="justify-start"
          >
            <span className="flex items-center">
              <span className="mr-2">➡️</span>
              Switch to Next Task
            </span>
            <span className="ml-auto text-xs text-muted-foreground">Alt+N</span>
          </Button>
        )}
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-medium mb-2">Keyboard Shortcuts</h3>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>F - Start Focus Mode</p>
          <p>Shift+F - End Focus Mode</p>
          <p>Alt+F - Pause/Resume</p>
          <p>Alt+C - Complete Task</p>
          <p>Alt+N - Next Task</p>
        </div>
      </div>
    </div>
  );
}
