import { Client } from "@microsoft/microsoft-graph-client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { TaskStatus } from "@/types/task";

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
      return response.value;
    } catch (error) {
      logger.log("Failed to get task lists", { error });
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

      for (const task of tasks) {
        // Skip completed tasks if not included
        if (!options.includeCompleted && task.completedDateTime) {
          results.skipped++;
          continue;
        }

        try {
          await prisma.task.create({
            data: {
              title: task.title,
              description: task.body?.content,
              status: this.mapStatus(task.status),
              dueDate: task.dueDateTime ? new Date(task.dueDateTime) : null,
              priority: this.mapPriority(task.importance),
              projectId,
              externalTaskId: task.id,
              source: "OUTLOOK",
              lastSyncedAt: new Date(),
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
        data: { lastImported: new Date() },
      });

      return results;
    } catch (error) {
      logger.log("Failed to import tasks", { error, listId, projectId });
      throw error;
    }
  }
}
