"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

import { format } from "@/lib/date-utils";

import { Task, TaskStatus } from "@/types/task";

interface FocusedTaskProps {
  task: Task | null;
}

// Function to convert URLs in text to hyperlinks
function linkifyText(text: string): React.ReactNode[] {
  if (!text) return [text];

  // Regular expression to match URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  // Split the text by URLs
  const parts = text.split(urlRegex);

  // Find all URLs in the text
  const urls = text.match(urlRegex) || [];

  // Combine parts and URLs
  const result: React.ReactNode[] = [];

  parts.forEach((part, i) => {
    result.push(part);
    if (urls[i]) {
      result.push(
        <a
          key={i}
          href={urls[i]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          {urls[i]}
        </a>
      );
    }
  });

  return result;
}

export function FocusedTask({ task }: FocusedTaskProps) {
  if (!task) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <p className="text-lg text-muted-foreground">No task selected</p>
      </div>
    );
  }

  return (
    <Card className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="task-title mb-2 text-2xl font-bold">{task.title}</h2>

          {/* Display tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {task.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="px-2 py-0.5"
                  style={{
                    backgroundColor: tag.color ? `${tag.color}20` : undefined,
                    color: tag.color,
                    borderColor: tag.color ? `${tag.color}40` : undefined,
                  }}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        {task.dueDate && (
          <div>
            <h3 className="mb-1 text-sm font-medium">Due Date</h3>
            <p className="text-muted-foreground">
              {format(task.dueDate, "PPP")}
            </p>
          </div>
        )}
        {task.completedAt && task.status === TaskStatus.COMPLETED && (
          <div>
            <h3 className="mb-1 text-sm font-medium">Completed On</h3>
            <p className="text-muted-foreground">
              {format(task.completedAt, "PPP p")}
            </p>
          </div>
        )}
        {task.duration && (
          <div>
            <h3 className="mb-1 text-sm font-medium">Estimated Duration</h3>
            <p className="text-muted-foreground">{task.duration} minutes</p>
          </div>
        )}
        {task.scheduleScore && (
          <div>
            <h3 className="mb-1 text-sm font-medium">Focus Score</h3>
            <p className="text-muted-foreground">
              {task.scheduleScore.toFixed(2)}
            </p>
          </div>
        )}
        {task.isRecurring && (
          <div>
            <h3 className="mb-1 text-sm font-medium">Recurring Task</h3>
            <p className="text-muted-foreground">This task repeats</p>
          </div>
        )}
      </div>

      {/* Task description with hyperlinks */}
      {task.description && (
        <div className="border-t border-border pt-4">
          <h3 className="mb-2 text-sm font-medium">Description</h3>
          <div className="task-description overflow-auto whitespace-pre-wrap text-muted-foreground">
            {linkifyText(task.description)}
          </div>
        </div>
      )}
    </Card>
  );
}
