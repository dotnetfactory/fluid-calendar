"use client";

import { FocusTask } from "@/types/focus";
import { useFocusModeStore } from "@/store/focusMode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format } from "@/lib/date-utils";
import { HiClock } from "react-icons/hi";

interface FocusedTaskProps {
  task: FocusTask | null;
}

export function FocusedTask({ task }: FocusedTaskProps) {
  const { completeCurrentTask, postponeTask } = useFocusModeStore();

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-lg text-muted-foreground">No task selected</p>
      </div>
    );
  }

  return (
    <Card className="p-6 h-full flex flex-col">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">{task.title}</h2>
          {task.description && (
            <p className="text-muted-foreground mb-4">{task.description}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button variant="default" onClick={() => completeCurrentTask()}>
            Complete Task
          </Button>
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => postponeTask("1h")}
              className="flex items-center"
            >
              <HiClock className="mr-1 h-3 w-3" /> 1h
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => postponeTask("3h")}
              className="flex items-center"
            >
              <HiClock className="mr-1 h-3 w-3" /> 3h
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => postponeTask("1d")}
              className="flex items-center"
            >
              <HiClock className="mr-1 h-3 w-3" /> 1d
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {task.dueDate && (
          <div>
            <h3 className="text-sm font-medium mb-1">Due Date</h3>
            <p className="text-muted-foreground">
              {format(task.dueDate, "PPP")}
            </p>
          </div>
        )}
        {task.completedAt && (
          <div>
            <h3 className="text-sm font-medium mb-1">Completed On</h3>
            <p className="text-muted-foreground">
              {format(task.completedAt, "PPP p")}
            </p>
          </div>
        )}
        {task.duration && (
          <div>
            <h3 className="text-sm font-medium mb-1">Estimated Duration</h3>
            <p className="text-muted-foreground">{task.duration} minutes</p>
          </div>
        )}
        {task.focusScore && (
          <div>
            <h3 className="text-sm font-medium mb-1">Focus Score</h3>
            <p className="text-muted-foreground">
              {task.focusScore.toFixed(2)}
            </p>
          </div>
        )}
        {task.isRecurring && (
          <div>
            <h3 className="text-sm font-medium mb-1">Recurring Task</h3>
            <p className="text-muted-foreground">This task repeats</p>
          </div>
        )}
      </div>

      {/* Add more task details and actions as needed */}
      <div className="flex-1">
        {/* Space for future additions like notes, subtasks, etc. */}
      </div>
    </Card>
  );
}
