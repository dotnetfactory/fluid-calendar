import { Client } from "@microsoft/microsoft-graph-client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { TaskStatus } from "@/types/task";
import { newDate } from "./date-utils";
import { convertOutlookRecurrenceToRRule } from "./outlook-calendar";

interface OutlookDateTime {
  dateTime: string;
  timeZone: string;
}

interface RecurrencePattern {
  type: string;
  interval: number;
  month?: number;
  dayOfMonth?: number;
  daysOfWeek?: string[];
  firstDayOfWeek?: string;
  index?: string;
}

interface RecurrenceRange {
  type: string;
  startDate: string;
  endDate?: string;
  numberOfOccurrences?: number;
  recurrenceTimeZone?: string;
}

interface PatternedRecurrence {
  pattern: RecurrencePattern;
  range: RecurrenceRange;
}

export interface OutlookTask {
  id: string;
  title: string;
  status: string;
  importance: string;
  sensitivity: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  isReminderOn: boolean;
  reminderDateTime?: OutlookDateTime;
  completedDateTime?: OutlookDateTime;
  dueDateTime?: OutlookDateTime;
  startDateTime?: OutlookDateTime;
  body?: {
    content: string;
    contentType: string;
  };
  categories?: string[];
  recurrence?: PatternedRecurrence;
}

export interface OutlookTaskList {
  id: string;
  name: string;
  isDefaultFolder: boolean;
  parentGroupKey?: string;
}

interface OutlookTaskListResponse {
  id: string;
  displayName: string;
  wellknownListName?: string;
  parentGroupKey?: string;
}

const LOG_SOURCE = "OutlookTasks";

export class OutlookTasksService {
  private client: Client;
  private accountId: string;

  constructor(client: Client, accountId: string) {
    this.client = client;
    this.accountId = accountId;
  }

  async getTaskLists(): Promise<OutlookTaskList[]> {
    try {
      const response = await this.client.api("/me/todo/lists").get();
      if (!response.value || !Array.isArray(response.value)) {
        logger.error(
          "[ERROR] Invalid response format from Outlook API",
          {
            response: JSON.stringify(response),
          },
          LOG_SOURCE
        );
        throw new Error("Invalid response format from Outlook API");
      }
      return response.value.map((list: OutlookTaskListResponse) => ({
        id: list.id,
        name: list.displayName,
        isDefaultFolder: list.wellknownListName === "defaultList",
        parentGroupKey: list.parentGroupKey,
      }));
    } catch (error) {
      logger.error(
        "[ERROR] Failed to get task lists",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Gets all tasks from an Outlook task list, handling pagination
   * @param listId The ID of the task list to fetch tasks from
   * @returns Promise<OutlookTask[]> Array of all tasks in the list
   */
  async getTasks(listId: string): Promise<OutlookTask[]> {
    try {
      let url = `/me/todo/lists/${listId}/tasks`;
      const allTasks: OutlookTask[] = [];

      while (url) {
        const response = await this.client
          .api(url.includes("https://") ? url : url)
          .get();

        allTasks.push(...response.value);

        // Get the next page URL if it exists, extract just the path if it's a full URL
        url = response["@odata.nextLink"] || "";
        if (url.includes("https://")) {
          url = url.split("graph.microsoft.com/v1.0")[1];
        }
      }

      return allTasks;
    } catch (error) {
      logger.error(
        "Failed to get tasks",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  private mapPriority(importance: string): string {
    switch (importance.toLowerCase()) {
      case "high":
        return "high";
      case "low":
        return "low";
      default:
        return "medium";
    }
  }

  private mapStatus(outlookStatus: string): TaskStatus {
    switch (outlookStatus.toLowerCase()) {
      case "completed":
        return TaskStatus.COMPLETED;
      case "inProgress":
        return TaskStatus.IN_PROGRESS;
      default:
        return TaskStatus.TODO;
    }
  }

  async importTasksToProject(
    listId: string,
    projectId: string,
    options: {
      includeCompleted?: boolean;
      dateRange?: { start: Date; end: Date };
    } = {},
    userId: string
  ) {
    try {
      const tasks = await this.getTasks(listId);
      const results = {
        imported: 0,
        skipped: 0,
        failed: 0,
        errors: [] as Array<{ taskId: string; error: string }>,
      };

      // Get the mapping to check isAutoScheduled setting
      const mapping = await prisma.outlookTaskListMapping.findUnique({
        where: {
          externalListId_projectId: {
            externalListId: listId,
            projectId: projectId,
          },
        },
      });

      if (!mapping) {
        throw new Error("Task list mapping not found");
      }

      for (const task of tasks) {
        try {
          // Skip completed tasks if not included
          if (!options.includeCompleted && task.completedDateTime) {
            results.skipped++;
            continue;
          }

          // Check if task already exists
          const existingTask = await prisma.task.findFirst({
            where: {
              externalTaskId: task.id,
              source: "OUTLOOK",
              userId,
            },
          });

          if (existingTask) {
            results.skipped++;
            continue;
          }

          // Create the base task data
          const taskData = {
            title: task.title,
            description: task.body?.content,
            status: this.mapStatus(task.status),
            dueDate: task.dueDateTime?.dateTime
              ? newDate(task.dueDateTime.dateTime)
              : null,
            priority: this.mapPriority(task.importance),
            projectId,
            externalTaskId: task.id,
            isAutoScheduled: mapping.isAutoScheduled,
            scheduleLocked: false,
            source: "OUTLOOK",
            lastSyncedAt: newDate(),
            userId,
          };

          // Handle recurrence if present
          if (task.recurrence) {
            const rrule = convertOutlookRecurrenceToRRule({
              pattern: task.recurrence.pattern,
              range: task.recurrence.range,
            });

            await prisma.task.create({
              data: {
                ...taskData,
                isRecurring: true,
                recurrenceRule: rrule,
              },
            });
          } else {
            await prisma.task.create({
              data: taskData,
            });
          }

          results.imported++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            taskId: task.id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Update the mapping's last import time
      await prisma.outlookTaskListMapping.update({
        where: {
          externalListId_projectId: {
            externalListId: listId,
            projectId: projectId,
          },
        },
        data: { lastImported: newDate() },
      });

      return results;
    } catch (error) {
      logger.error(
        "Failed to import tasks",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          listId,
          projectId,
        },
        LOG_SOURCE
      );
      throw error;
    }
  }
}
