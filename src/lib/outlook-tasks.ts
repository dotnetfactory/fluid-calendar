import { Client } from "@microsoft/microsoft-graph-client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { TaskStatus } from "@/types/task";
import { newDate } from "./date-utils";

export interface OutlookTask {
  id: string;
  title: string;
  status: string;
  importance: string;
  sensitivity: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  isReminderOn: boolean;
  reminderDateTime?: string;
  completedDateTime?: string;
  dueDateTime?: string;
  startDateTime?: string;
  body?: {
    content: string;
    contentType: string;
  };
  categories?: string[];
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

export class OutlookTasksService {
  private client: Client;
  private accountId: string;

  constructor(client: Client, accountId: string) {
    this.client = client;
    this.accountId = accountId;
  }

  async getTaskLists(): Promise<OutlookTaskList[]> {
    try {
      logger.log("[DEBUG] Fetching Outlook task lists");
      const response = await this.client.api("/me/todo/lists").get();
      logger.log("[DEBUG] Outlook task lists response", { response });
      if (!response.value || !Array.isArray(response.value)) {
        logger.log("[ERROR] Invalid response format from Outlook API", {
          response,
        });
        throw new Error("Invalid response format from Outlook API");
      }
      return response.value.map((list: OutlookTaskListResponse) => ({
        id: list.id,
        name: list.displayName,
        isDefaultFolder: list.wellknownListName === "defaultList",
        parentGroupKey: list.parentGroupKey,
      }));
    } catch (error) {
      logger.log("[ERROR] Failed to get task lists", { error });
      throw error;
    }
  }

  async getTasks(listId: string): Promise<OutlookTask[]> {
    try {
      const response = await this.client
        .api(`/me/todo/lists/${listId}/tasks`)
        .get();
      return response.value;
    } catch (error) {
      logger.log("Failed to get tasks", { error });
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
    } = {}
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
        where: { externalListId: listId },
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
            },
          });

          if (existingTask) {
            results.skipped++;
            continue;
          }

          await prisma.task.create({
            data: {
              title: task.title,
              description: task.body?.content,
              status: this.mapStatus(task.status),
              dueDate: task.dueDateTime ? newDate(task.dueDateTime) : null,
              priority: this.mapPriority(task.importance),
              projectId,
              externalTaskId: task.id,
              isAutoScheduled: mapping.isAutoScheduled,
              scheduleLocked: false,
              source: "OUTLOOK",
              lastSyncedAt: newDate(),
            },
          });
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
        where: { externalListId: listId },
        data: { lastImported: newDate() },
      });

      return results;
    } catch (error) {
      logger.log("Failed to import tasks", { error, listId, projectId });
      throw error;
    }
  }
}
