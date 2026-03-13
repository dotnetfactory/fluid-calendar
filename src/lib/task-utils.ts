import { TaskStatus } from "@/types/task";

import { newDate } from "./date-utils";

export const DEFAULT_TASK_COLOR = "#f2fbff";
/**
 * Checks if a task is overdue based on its due date and completion status
 * @param task The task object or task properties to check
 * @returns boolean indicating if the task is overdue
 */
export function isTaskOverdue(task: {
  dueDate?: Date | string | null;
  status?: string;
}): boolean {
  return (
    !!task.dueDate &&
    task.status !== TaskStatus.COMPLETED &&
    newDate(task.dueDate) < newDate()
  );
}
