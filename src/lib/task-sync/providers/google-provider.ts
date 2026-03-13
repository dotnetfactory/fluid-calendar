import { google } from "googleapis";

import { logger } from "@/lib/logger";
import { TokenManager } from "@/lib/token-manager";

import { TaskStatus, Priority, Task } from "@/types/task";
import type { tasks_v1 } from "googleapis";

import {
  ExternalTask,
  ExternalTaskList,
  SyncOptions,
  TaskChange,
  TaskProviderInterface,
  TaskToCreate,
  TaskUpdates,
} from "./task-provider.interface";

const LOG_SOURCE = "GoogleTaskProvider";

/**
 * Task provider implementation for Google Tasks
 */
export class GoogleTaskProvider implements TaskProviderInterface {
  private client: ReturnType<typeof google.tasks>;
  private accountId: string;
  private userId: string;

  constructor(client: ReturnType<typeof google.tasks>, accountId: string, userId: string) {
    this.client = client;
    this.accountId = accountId;
    this.userId = userId;
  }

  getType(): string {
    return "GOOGLE";
  }

  getName(): string {
    return "Google Tasks";
  }

  async getTaskLists(): Promise<ExternalTaskList[]> {
    // Use retry wrapper for resiliency
    return this.apiCall(async () => {
      const lists: ExternalTaskList[] = [];
      let pageToken: string | undefined;

      do {
        const res = await this.client.tasklists.list({ pageToken });
        const items = res.data.items || [];

        lists.push(
          ...items.map((l) => ({
            id: l.id || "",
            name: l.title || "",
            isDefault: false,
          }))
        );

        pageToken = res.data.nextPageToken || undefined;
      } while (pageToken);

      return lists;
    }, "getTaskLists");
  }

  async getTasks(listId: string, options?: SyncOptions): Promise<ExternalTask[]> {
    return this.apiCall(async () => {
      const tasks: ExternalTask[] = [];
      let pageToken: string | undefined;

      do {
        type TasksListParams = tasks_v1.Params$Resource$Tasks$List;
        const params: TasksListParams = { tasklist: listId, pageToken } as TasksListParams;

        if (options) {
          if (options.includeCompleted === false) params.showCompleted = false;
          if (options.since) params.updatedMin = options.since.toISOString();
        }

        const res = await this.client.tasks.list(params);
        const items = res.data.items || []; 

        tasks.push(
          ...items.map((t) => ({
            id: t.id || "",
            title: t.title || "",
            description: t.notes || null,
            status: t.status || undefined,
            listId,
            dueDate: t.due ? new Date(t.due as string) : undefined,
            completedDate: (t.completed && new Date(t.completed as string)) || undefined,
            lastModified: t.updated ? new Date(t.updated as string) : undefined,
            lastModifiedDateTime: t.updated as string | undefined,
            url: t.selfLink as string | undefined,
          }))
        );

        pageToken = res.data.nextPageToken || undefined;
      } while (pageToken);

      return tasks;
    }, "getTasks");
  }

  async createTask(listId: string, task: TaskToCreate): Promise<ExternalTask> {
    return this.apiCall(async () => {
      const body: tasks_v1.Schema$Task = {
        title: task.title,
        notes: task.description || undefined,
      };

      if (task.dueDate) body.due = new Date(task.dueDate).toISOString();
      if (task.status) body.status = this.mapStatusToGoogle(task.status as string);

      const res = await this.client.tasks.insert({ tasklist: listId, requestBody: body });

      const t = res.data;

      return {
        id: t.id || "",
        title: t.title || "",
        description: t.notes || null,
        status: t.status || undefined,
        listId,
        dueDate: t.due ? new Date(t.due as string) : undefined,
        completedDate: (t.completed && new Date(t.completed as string)) || undefined,
        lastModified: t.updated ? new Date(t.updated as string) : undefined,
        lastModifiedDateTime: t.updated as string | undefined,
        url: t.selfLink as string | undefined,
      };
    }, "createTask");
  }

  async updateTask(listId: string, taskId: string, updates: TaskUpdates): Promise<ExternalTask> {
    return this.apiCall(async () => {
      const body: Partial<tasks_v1.Schema$Task> = {};

      if (updates.title !== undefined) body.title = updates.title;
      if (updates.description !== undefined) body.notes = updates.description || undefined;
      if (updates.dueDate !== undefined) body.due = updates.dueDate ? new Date(updates.dueDate).toISOString() : null;
      if (updates.status !== undefined) body.status = this.mapStatusToGoogle(updates.status as string | null);

      const res = await this.client.tasks.patch({ tasklist: listId, task: taskId, requestBody: body });

      const t = res.data;

      return {
        id: t.id || "",
        title: t.title || "",
        description: t.notes || null,
        status: t.status || undefined,
        listId,
        dueDate: t.due ? new Date(t.due as string) : undefined,
        completedDate: (t.completed && new Date(t.completed as string)) || undefined,
        lastModified: t.updated ? new Date(t.updated as string) : undefined,
        lastModifiedDateTime: t.updated as string | undefined,
        url: t.selfLink as string | undefined,
      };
    }, "updateTask");
  }

  async deleteTask(listId: string, taskId: string): Promise<void> {
    return this.apiCall(async () => {
      await this.client.tasks.delete({ tasklist: listId, task: taskId });
    }, "deleteTask");
  }

  async getChanges(listId: string, since?: Date): Promise<TaskChange[]> {
    return this.apiCall(async () => {
      const tasks = await this.getTasks(listId);
      const changes: TaskChange[] = [];

      if (since) {
        for (const t of tasks) {
          if (t.lastModified && t.lastModified > since) {
            changes.push({
              id: `change-${t.id}-${Date.now()}`,
              taskId: t.id,
              listId: listId,
              type: "UPDATE",
              timestamp: t.lastModified,
              changes: { task: t },
            });
          }
        }
      }

      return changes;
    }, "getChanges");
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.getTaskLists();
      return true;
    } catch (error) {
      logger.error(
        "Failed to validate Google connection",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
      return false;
    }
  }

  mapToInternalTask(externalTask: ExternalTask, projectId: string) {
    return {
      title: externalTask.title,
      description: externalTask.description || null,
      status: this.mapStatusFromGoogle(externalTask.status as string | null),
      priority: Priority.MEDIUM,
      projectId,
      dueDate: externalTask.dueDate || null,
      startDate: externalTask.startDate || null,
      completedAt: externalTask.completedDate || null,
      isRecurring: externalTask.isRecurring || false,
      recurrenceRule: externalTask.recurrenceRule || null,
      source: this.getType(),
      isAutoScheduled: false,
      scheduleLocked: false,
      tags: [],
      project: null,
      energyLevel: null,
      preferredTime: null,
    };
  }

  mapToExternalTask(task: Partial<Task>): TaskToCreate {
    return {
      title: task.title || "",
      description: task.description || "",
      status: task.status || null,
      priority: task.priority || null,
      // Google Tasks does not support RRULE-style recurrence; skip recurrence
      dueDate: task.dueDate || null,
      startDate: task.startDate || null,
    };
  }

  private mapStatusToGoogle(status?: string | null): string | undefined {
    if (!status) return undefined;
    switch (status) {
      case "completed":
      case TaskStatus.COMPLETED:
        return "completed";
      default:
        return "needsAction";
    }
  }

  private mapStatusFromGoogle(status?: string | null) {
    if (!status) return TaskStatus.TODO;
    switch ((status || "").toLowerCase()) {
      case "completed":
        return TaskStatus.COMPLETED;
      default:
        return TaskStatus.TODO;
    }
  }

  /**
   * Generic API call wrapper with retries/backoff for transient errors (rate limits, network)
   */
  private async apiCall<T>(fn: () => Promise<T>, operation = "apiCall") {
    const maxRetries = 3;
    let attempt = 0;

    while (true) {
      try {
        return await fn();
      } catch (err: unknown) {
        attempt++;

        const e = err as { response?: { status?: number }; code?: string };
        const status = e?.response?.status ?? e?.code;

        // Retry on network errors or rate limit (429)
        const isRetryable =
          status === 429 || // rate limit
          e?.code === "ETIMEDOUT" ||
          e?.code === "ECONNRESET" ||
          e?.code === "EAI_AGAIN";

        const msg = err instanceof Error ? err.message : String(err);

        logger.error(
          `Google API error during ${operation}`,
          { error: msg, attempt, status: status ?? null },
          LOG_SOURCE
        );

        if (!isRetryable || attempt >= maxRetries) {
          // Exhausted retries or non-retryable
          throw err;
        }

        // Exponential backoff with jitter
        const backoff = Math.pow(2, attempt) * 250 + Math.floor(Math.random() * 100);
        await new Promise((res) => setTimeout(res, backoff));
        continue;
      }
    }
  }
}

/**
 * Helper to create an authenticated Google Tasks client
 */
export async function getGoogleTasksClient(accountId: string, userId: string) {
  const tokenManager = TokenManager.getInstance();

  let tokens = await tokenManager.getTokens(accountId, userId);
  if (!tokens) throw new Error("No tokens found for account");

  if (tokens.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    tokens = await tokenManager.refreshGoogleTokens(accountId, userId);
    if (!tokens) throw new Error("Failed to refresh tokens");
  }

  const { createGoogleOAuthClient } = await import("@/lib/google");

  const oauth2Client = await createGoogleOAuthClient({
    redirectUrl: `${process.env.NEXTAUTH_URL}/api/auth/callback/google`,
  });

  // Set credentials
  oauth2Client.setCredentials({ access_token: tokens.accessToken, refresh_token: tokens.refreshToken });

  // Create tasks client
  return google.tasks({ version: "v1", auth: oauth2Client });
}
