"use client";

import { useFocusModeStore } from "@/store/focusMode";
import { Button } from "@/components/ui/button";

export function QuickActions() {
  const {
    completeCurrentTask,
    queuedTaskIds,
    switchToTask,
  } = useFocusModeStore();

  return (
    <div className="flex flex-col p-4 space-y-4">
      <h2 className="text-lg font-semibold">Quick Actions</h2>

      <div className="flex flex-col space-y-2">

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
          </Button>
        )}
      </div>


    </div>
  );
}
