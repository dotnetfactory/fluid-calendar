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
    <div className="flex flex-col space-y-4">
      <h2 className="text-lg font-semibold">Queue</h2>

      <div className="flex flex-col space-y-2">
        {tasks.map((task) => (
          <Button
            key={task.id}
            variant="ghost"
            className={cn(
              "justify-start h-auto py-3 px-4",
              "hover:bg-accent hover:text-accent-foreground",
              task.id === currentTaskId && "bg-accent text-accent-foreground"
            )}
            onClick={() => switchToTask(task.id)}
          >
            <div className="flex flex-col items-start text-left">
              <span className="font-medium">{task.title}</span>
              {task.description && (
                <span className="text-sm text-muted-foreground line-clamp-2">
                  {task.description}
                </span>
              )}
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
