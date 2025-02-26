"use client";

import { Card } from "@/components/ui/card";
import { format } from "@/lib/date-utils";
import { Task, TaskStatus } from "@/types/task";
import { Badge } from "@/components/ui/badge";

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

          {/* Display tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
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

      <div className="grid grid-cols-2 gap-4 mb-6">
        {task.dueDate && (
          <div>
            <h3 className="text-sm font-medium mb-1">Due Date</h3>
            <p className="text-muted-foreground">
              {format(task.dueDate, "PPP")}
            </p>
          </div>
        )}
        {task.completedAt && task.status === TaskStatus.COMPLETED && (
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
        {task.scheduleScore && (
          <div>
            <h3 className="text-sm font-medium mb-1">Focus Score</h3>
            <p className="text-muted-foreground">
              {task.scheduleScore.toFixed(2)}
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

      {/* Task description with hyperlinks */}
      {task.description && (
        <div className="pt-4 border-t border-border">
          <h3 className="text-sm font-medium mb-2">Description</h3>
          <div className="text-muted-foreground whitespace-pre-wrap overflow-auto ">
            {linkifyText(task.description)}
          </div>
        </div>
      )}
    </Card>
  );
}
