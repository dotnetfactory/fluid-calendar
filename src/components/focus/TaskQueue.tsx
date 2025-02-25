"use client";

import { FocusTask } from "@/types/focus";
import { useFocusModeStore } from "@/store/focusMode";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TaskQueueProps {
  tasks: FocusTask[];
}

export function TaskQueue({ tasks }: TaskQueueProps) {
  const { switchToTask, currentTaskId } = useFocusModeStore();

  return (
    <div className="flex flex-col p-4 h-full">
      <h2 className="text-lg font-semibold mb-4">Queue</h2>

      <div className="flex flex-col space-y-2 overflow-y-auto">
        {tasks.map((task) => (
          <Button
            key={task.id}
            variant="ghost"
            className={cn(
              "justify-start h-auto py-3 px-4 w-full",
              "hover:bg-accent hover:text-accent-foreground",
              task.id === currentTaskId && "bg-accent text-accent-foreground"
            )}
            onClick={() => switchToTask(task.id)}
          >
            <div className="flex flex-col items-start text-left w-full">
              <span className="font-medium truncate w-full">{task.title}</span>

              {task.focusScore && (
                <span className="text-xs text-muted-foreground mt-1">
                  Score: {task.focusScore.toFixed(2)}
                </span>
              )}
            </div>
          </Button>
        ))}

        {tasks.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">
            No tasks in queue
          </div>
        )}
      </div>
    </div>
  );
}
