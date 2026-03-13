/**
 * TaskSyncManager
 *
 * Central service to coordinate task synchronization across multiple providers.
 * This class is responsible for:
 * - Initializing providers based on their type
 * - Managing sync operations for task lists
 * - Handling task operations that trigger syncs
 * - Resolving conflicts between local and remote tasks
 */
import {
  TaskProvider as DbTaskProvider,
  TaskListMapping,
} from "@prisma/client";

import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
// import { CalDAVTaskProvider } from "./providers/caldav-provider";
// Import utility to get Microsoft Graph client
import { getMsGraphClient } from "@/lib/outlook-utils";
import { prisma } from "@/lib/prisma";

import { TaskStatus } from "@/types/task";

import { GhostTaskFilter } from "../ghost-task-filter";
import { FieldMapper } from "./field-mapper";
import { OutlookFieldMapper } from "./providers/outlook-field-mapper";
// Import provider implementations
import { OutlookTaskProvider } from "./providers/outlook-provider";
import {
  ExternalTask,
  TaskProviderInterface,
} from "./providers/task-provider.interface";
import { TaskChangeTracker } from "./task-change-tracker";
import { SyncResult, TaskWithSync } from "./types";

const LOG_SOURCE = "TaskSyncManager";

/**
 * Options for conflict resolution
 */
export type ConflictResolution =
  | { strategy: "USE_LOCAL" }
  | { strategy: "USE_REMOTE" }
  | { strategy: "MERGE"; fields: Record<string, "LOCAL" | "REMOTE"> };

export class TaskSyncManager {
  /**
   * Get an appropriate field mapper for a provider type
   *
   * @param providerType The type of provider
   * @returns A field mapper for the provider
   */
  getFieldMapper(providerType: string): FieldMapper {
    switch (providerType.toUpperCase()) {
      case "OUTLOOK":
        return new OutlookFieldMapper();
      // Add cases for other provider types
      default:
        return new FieldMapper();
    }
  }

  /**
   * Initialize a provider based on its type
   *
   * @param providerId The database ID of the provider
   * @returns A provider instance implementing TaskProviderInterface
   */
  async getProvider(providerId: string): Promise<TaskProviderInterface> {
    // Fetch provider details from database
    const dbProvider = await prisma.taskProvider.findUnique({
      where: { id: providerId },
      include: {
        // We need to check the account schema
        account: true,
      },
    });

    if (!dbProvider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    // Initialize the appropriate provider based on type
    // This will be expanded as we add more provider implementations
    switch (dbProvider.type) {
      case "OUTLOOK":
        if (!dbProvider.accountId) {
          throw new Error(
            `Missing account ID for Outlook provider ${providerId}`
          );
        }
        // Get Microsoft Graph client for the account
        const client = await getMsGraphClient(dbProvider.accountId);
        return new OutlookTaskProvider(client, dbProvider.accountId);
      // case "CALDAV":
      //   return new CalDAVTaskProvider(dbProvider);
      default:
        throw new Error(`Unsupported provider type: ${dbProvider.type}`);
    }
  }

  /**
   * Sync a specific task list
   *
   * @param mappingOrId Either a mapping ID or a mapping object with provider
   * @returns Sync result
   */
  async syncTaskList(
    mappingOrId: string | (TaskListMapping & { provider: DbTaskProvider })
  ): Promise<SyncResult> {
    try {
      // Get the mapping if we only have an ID
      const mapping =
        typeof mappingOrId === "string"
          ? await prisma.taskListMapping.findUnique({
              where: { id: mappingOrId },
              include: { provider: true },
            })
          : mappingOrId;

      if (!mapping) {
        const errorMsg = `Task list mapping not found: ${mappingOrId}`;
        logger.error(
          "Mapping not found",
          {
            mappingOrId:
              typeof mappingOrId === "string" ? mappingOrId : mappingOrId.id,
            error: errorMsg,
          },
          LOG_SOURCE
        );
        throw new Error(errorMsg);
      }

      logger.info(
        "Starting task list sync",
        {
          mappingId: mapping.id,
          externalListName: mapping.externalListName,
          providerType: mapping.provider.type,
          syncType: "SPECIFIC_TASK_LIST",
        },
        LOG_SOURCE
      );

      // Skip syncing if this is an "Unknown List"
      if (mapping.externalListName?.toLowerCase() === "unknown list") {
        logger.info(
          "Skipping sync for Unknown List",
          {
            mappingId: mapping.id,
            externalListName: mapping.externalListName,
            reason: "unknown_list_skipped",
          },
          LOG_SOURCE
        );

        // Return successful result with zero operations
        return {
          mappingId: mapping.id,
          providerId: mapping.providerId,
          providerType: mapping.provider.type,
          success: true,
          imported: 0,
          updated: 0,
          deleted: 0,
          skipped: 0,
          direction: "bidirectional",
          errors: [],
        };
      }

      // Get the provider instance
      const provider = await this.getProvider(mapping.provider.id);
      const fieldMapper = this.getFieldMapper(mapping.provider.type);
      const tracker = new TaskChangeTracker();

      const result: SyncResult = {
        mappingId: mapping.id,
        providerId: mapping.provider.id,
        providerType: mapping.provider.type,
        success: true,
        imported: 0,
        updated: 0,
        deleted: 0,
        skipped: 0,
        direction: "bidirectional",
        errors: [],
      };

      logger.info(
        "Syncing bidirectionally",
        {
          mappingId: mapping.id,
          providerType: mapping.provider.type,
        },
        LOG_SOURCE
      );

      await this.syncBidirectional(
        provider,
        mapping,
        result,
        fieldMapper,
        tracker
      );

      // Update the mapping's last synced time
      await prisma.taskListMapping.update({
        where: { id: mapping.id },
        data: {
          lastSyncedAt: newDate(),
          syncStatus: result.success ? "synced" : "error",
          lastError: result.errors.length > 0 ? result.errors[0].error : null,
        },
      });

      logger.info(
        "Task list sync completed",
        {
          mappingId: mapping.id,
          externalListName: mapping.externalListName,
          imported: result.imported,
          updated: result.updated,
          deleted: result.deleted,
          skipped: result.skipped,
          errors: result.errors.length,
        },
        LOG_SOURCE
      );

      return result;
    } catch (error) {
      logger.error(
        "Task list sync error",
        {
          mappingOrId:
            typeof mappingOrId === "string" ? mappingOrId : mappingOrId.id,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );

      throw error;
    }
  }

  /**
   * Sync all task lists for a user
   *
   * @param userId The ID of the user to sync
   * @returns Array of sync results
   */
  async syncAllForUser(userId: string): Promise<SyncResult[]> {
    logger.info(
      "Starting sync all for user",
      {
        userId,
        syncType: "ALL_USER_MAPPINGS",
      },
      LOG_SOURCE
    );

    try {
      // Get all enabled task list mappings for the user
      const mappings = await prisma.taskListMapping.findMany({
        where: {
          provider: {
            userId,
            syncEnabled: true,
          },
          syncEnabled: true,
        },
        include: {
          provider: true,
        },
      });

      logger.info(
        "Found user mappings",
        {
          userId,
          mappingsCount: mappings.length,
        },
        LOG_SOURCE
      );

      const results: SyncResult[] = [];

      // Sync each mapping
      for (const mapping of mappings) {
        try {
          const result = await this.syncTaskList(mapping);
          results.push(result);

          logger.info(
            "User mapping completed",
            {
              userId,
              mappingId: mapping.id,
              success: result.success,
              imported: result.imported,
              updated: result.updated,
              deleted: result.deleted,
              skipped: result.skipped,
              errors: result.errors.length,
            },
            LOG_SOURCE
          );
        } catch (error) {
          logger.error(
            `Failed to sync mapping ${mapping.id}`,
            {
              error: error instanceof Error ? error.message : "Unknown error",
            },
            LOG_SOURCE
          );

          // Add error result
          results.push({
            mappingId: mapping.id,
            providerId: mapping.providerId,
            providerType: "", // Will be filled in by syncTaskList if it gets far enough
            success: false,
            imported: 0,
            updated: 0,
            deleted: 0,
            skipped: 0,
            direction: "bidirectional",
            errors: [
              {
                taskId: "general",
                error: error instanceof Error ? error.message : "Unknown error",
              },
            ],
          });
        }
      }

      // Calculate totals
      const totals = results.reduce(
        (acc, r) => {
          acc.imported += r.imported;
          acc.updated += r.updated;
          acc.deleted += r.deleted;
          acc.skipped += r.skipped;
          acc.errorCount += r.errors.length;
          return acc;
        },
        { imported: 0, updated: 0, deleted: 0, skipped: 0, errorCount: 0 }
      );

      logger.info(
        "All user mappings completed",
        {
          userId,
          totalMappings: mappings.length,
          successfulMappings: results.filter((r) => r.success).length,
          failedMappings: results.filter((r) => !r.success).length,
          imported: totals.imported,
          updated: totals.updated,
          deleted: totals.deleted,
          skipped: totals.skipped,
          errors: totals.errorCount,
        },
        LOG_SOURCE
      );

      return results;
    } catch (error) {
      logger.error(
        "All user mappings sync error",
        {
          userId,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Bidirectional sync implementation that compares timestamps
   * to determine which version (local or external) is more recent
   *
   * @param provider The task provider
   * @param mapping The task list mapping
   * @param result The sync result tracker
   * @param fieldMapper The field mapper for this provider type
   * @param tracker The change tracker
   */
  private async syncBidirectional(
    provider: TaskProviderInterface,
    mapping: TaskListMapping & { provider: DbTaskProvider },
    result: SyncResult,
    fieldMapper: FieldMapper,
    tracker: TaskChangeTracker
  ): Promise<void> {
    try {
      // Step 1: Fetch tasks from both sources
      const localTasks = (
        await prisma.task.findMany({
          where: {
            projectId: mapping.projectId,
          },
          include: {
            tags: true,
            project: true,
          },
        })
      ).map((task) => ({
        ...task,
        tags: task.tags || [],
        project: task.project || null,
        isRecurring: task.isRecurring || false,
        isAutoScheduled: task.isAutoScheduled || false,
        scheduleLocked: task.scheduleLocked || false,
      })) as unknown as TaskWithSync[];

      // Create lookup maps for tasks
      // We'll use localTaskByExternalId to find local tasks by their external ID
      const localTaskByExternalId = new Map(
        localTasks
          .filter((t) => t.externalTaskId && t.source === mapping.provider.type)
          .map((t) => [t.externalTaskId as string, t])
      );

      // Unlinked local tasks (tasks without external IDs that may need to be linked)
      let localUnlinkedTasks = localTasks.filter(
        (task) => !task.externalTaskId || task.source !== mapping.provider.type
      );

      // Step 2: Handle unsynced local changes first
      const changes = await tracker.getUnsyncedChanges(mapping.id);

      if (changes.length > 0) {
        const successfulChanges: string[] = [];
        // Keep track of tasks that were processed by CREATE changes
        const processedTaskIds = new Set<string>();

        for (const change of changes) {
          try {
            if (change.changeType === "CREATE") {
              await this.processCreateChange(
                change.taskId,
                provider,
                mapping,
                fieldMapper
              );
              processedTaskIds.add(change.taskId);
              result.imported++;
            } else if (change.changeType === "UPDATE") {
              await this.processUpdateChange(
                change.taskId,
                provider,
                mapping,
                fieldMapper
              );
              result.updated++;
            } else if (change.changeType === "DELETE") {
              await this.processDeleteChange(change, provider);
              result.deleted++;
            }

            successfulChanges.push(change.id);
          } catch (error) {
            result.errors.push({
              taskId: change.taskId,
              error: error instanceof Error ? error.message : "Unknown error",
            });
            result.skipped++;
          }
        }

        // Mark changes as synced
        if (successfulChanges.length > 0) {
          await tracker.markAsSynced(successfulChanges);
        }

        // Refresh local tasks data if we processed any changes
        if (processedTaskIds.size > 0) {
          // Get the updated task data for tasks we just processed
          const refreshedTasks = await prisma.task.findMany({
            where: {
              id: {
                in: Array.from(processedTaskIds),
              },
            },
            include: {
              tags: true,
              project: true,
            },
          });

          // Converted refreshed tasks to TaskWithSync
          const refreshedTasksWithSync = refreshedTasks.map((task) => ({
            ...task,
            tags: task.tags || [],
            project: task.project || null,
            isRecurring: task.isRecurring || false,
            isAutoScheduled: task.isAutoScheduled || false,
            scheduleLocked: task.scheduleLocked || false,
          })) as unknown as TaskWithSync[];

          // Update the localTaskByExternalId map with refreshed data
          for (const task of refreshedTasksWithSync) {
            if (task.externalTaskId && task.source === mapping.provider.type) {
              localTaskByExternalId.set(task.externalTaskId, task);
            }
          }

          // Remove processed tasks from localUnlinkedTasks
          localUnlinkedTasks = localUnlinkedTasks.filter(
            (task) => !processedTaskIds.has(task.id)
          );
        }
      }

      const externalTasks = await provider.getTasks(mapping.externalListId);

      // Initialize ghost task filter to identify problematic tasks
      const ghostFilter = new GhostTaskFilter([mapping.externalListId]);

      // Filter out ghost tasks before processing
      const validExternalTasks = externalTasks.filter((task) => {
        const taskData = {
          id: task.id,
          title: task.title || "",
          status: task.status,
          listId: mapping.externalListId,
          listName: mapping.externalListName,
          createdDateTime: undefined, // Not available in ExternalTask interface
          lastModifiedDateTime: task.lastModifiedDateTime,
          dueDateTime: task.dueDate
            ? { dateTime: task.dueDate.toISOString() }
            : null,
          startDateTime: task.startDate
            ? { dateTime: task.startDate.toISOString() }
            : null,
          recurrence: task.recurrenceRule
            ? { pattern: { type: "unknown" } }
            : null,
        };

        const shouldSync = ghostFilter.shouldSyncTask(taskData);

        if (!shouldSync) {
          result.skipped++;
        }

        return shouldSync;
      });

      // Step 3: Process each valid external task
      for (const externalTask of validExternalTasks) {
        try {
          // Find corresponding local task
          const localTask = localTaskByExternalId.get(externalTask.id);

          if (localTask) {
            // Task exists in both systems - resolve based on update timestamps
            await this.resolveTaskConflict(
              localTask,
              externalTask,
              provider,
              mapping,
              fieldMapper
            );
            result.updated++;
          } else {
            // External task not found locally - check if it matches an unlinked local task
            const matchedTask = this.findMatchingLocalTask(
              externalTask,
              localUnlinkedTasks
            );

            if (matchedTask) {
              // Link the local task to the external one
              await this.linkTasks(
                matchedTask,
                externalTask,
                mapping,
                provider.getType()
              );

              // Remove from unlinked collection to prevent double-processing
              const index = localUnlinkedTasks.indexOf(matchedTask);
              if (index !== -1) {
                localUnlinkedTasks.splice(index, 1);
              }

              result.updated++;
            } else {
              // Create a new local task for this external task
              const internalTask = fieldMapper.mapToInternalTask(
                externalTask,
                mapping.projectId
              );

              logger.info(
                "Creating new local task from external",
                {
                  externalTaskId: externalTask.id,
                  title: externalTask.title,
                  mappingId: mapping.id,
                },
                LOG_SOURCE
              );

              await prisma.task.create({
                data: {
                  title: internalTask.title || "Untitled Task",
                  description: internalTask.description,
                  status: internalTask.status || TaskStatus.TODO,
                  dueDate: internalTask.dueDate,
                  startDate: internalTask.startDate,
                  duration: internalTask.duration,
                  priority: internalTask.priority,
                  energyLevel: internalTask.energyLevel,
                  preferredTime: internalTask.preferredTime,
                  isRecurring: internalTask.isRecurring || false,
                  recurrenceRule: internalTask.recurrenceRule,
                  isAutoScheduled: mapping.isAutoScheduled,
                  scheduleLocked: false,
                  source: mapping.provider.type,
                  externalListId: mapping.externalListId,
                  externalTaskId: externalTask.id,
                  lastSyncedAt: newDate(),
                  syncStatus: "SYNCED",
                  userId: mapping.provider.userId,
                  projectId: mapping.projectId,
                  externalUpdatedAt: externalTask.lastModified
                    ? newDate(externalTask.lastModified)
                    : externalTask.lastModifiedDateTime
                      ? newDate(externalTask.lastModifiedDateTime)
                      : new Date(),
                  syncHash: tracker.generateTaskHash({
                    title: internalTask.title,
                    description: internalTask.description,
                    status: internalTask.status,
                    dueDate: internalTask.dueDate,
                  }),
                },
              });

              result.imported++;
            }
          }
        } catch (error) {
          result.errors.push({
            taskId: externalTask.id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          result.skipped++;
        }
      }

      // Step 4: Process unlinked local tasks to create in external system
      for (const localTask of localUnlinkedTasks) {
        try {
          // Skip tasks that have a source set but not matching this provider
          if (localTask.source && localTask.source !== mapping.provider.type) {
            continue;
          }

          // Create in external system
          const externalTask = fieldMapper.mapToExternalTask(localTask);
          const createdTask = await provider.createTask(
            mapping.externalListId,
            externalTask
          );

          // Update local task with external reference
          await prisma.task.update({
            where: { id: localTask.id },
            data: {
              externalTaskId: createdTask.id,
              externalListId: mapping.externalListId,
              source: mapping.provider.type,
              lastSyncedAt: newDate(),
              syncStatus: "SYNCED",
              externalUpdatedAt: createdTask.lastModified
                ? newDate(createdTask.lastModified)
                : createdTask.lastModifiedDateTime
                  ? newDate(createdTask.lastModifiedDateTime)
                  : new Date(),
              syncHash: tracker.generateTaskHash(localTask),
            },
          });

          result.imported++;
        } catch (error) {
          result.errors.push({
            taskId: localTask.id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          result.skipped++;
        }
      }

      // Step 5: Handle tasks that exist locally but have been deleted externally
      // Get all local tasks with external IDs from this provider
      const localTaskIds = new Set(localTaskByExternalId.keys());
      const externalTaskIds = new Set(externalTasks.map((task) => task.id));

      // Find tasks that exist locally but not externally
      const deletedTaskExternalIds = Array.from(localTaskIds).filter(
        (id) => !externalTaskIds.has(id)
      );

      for (const externalId of deletedTaskExternalIds) {
        const localTask = localTaskByExternalId.get(externalId);
        if (!localTask) continue;

        try {
          // Check if this task was recently modified locally
          const recentChanges = await prisma.taskChange.findMany({
            where: {
              taskId: localTask.id,
              timestamp: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
              },
            },
            orderBy: {
              timestamp: "desc",
            },
          });

          // If we have recent local changes, don't delete the task
          // This means the task was actively being used in FC
          if (recentChanges.length > 0) {
            continue;
          }

          // Delete the local task only if no recent changes
          await prisma.task.delete({
            where: { id: localTask.id },
          });

          result.deleted++;
        } catch (error) {
          result.errors.push({
            taskId: localTask.id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          result.skipped++;
        }
      }
    } catch (error) {
      logger.error(
        `Failed to sync bidirectionally`,
        {
          mappingId: mapping.id,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );

      throw error;
    }
  }

  /**
   * Process a CREATE change
   */
  private async processCreateChange(
    taskId: string,
    provider: TaskProviderInterface,
    mapping: TaskListMapping & { provider: DbTaskProvider },
    fieldMapper: FieldMapper
  ): Promise<void> {
    if (taskId === null) return; // This can happen if the task was deleted
    // Get the task details
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        tags: true,
        project: true,
      },
    });

    if (!task) {
      throw new Error(`Task ${taskId} not found for CREATE change`);
    }

    // Convert to TaskWithSync
    const taskWithSync = {
      ...task,
      tags: task.tags || [],
      project: task.project || null,
      isRecurring: task.isRecurring || false,
      isAutoScheduled: task.isAutoScheduled || false,
      scheduleLocked: task.scheduleLocked || false,
    } as unknown as TaskWithSync;

    // Skip tasks that already have an external ID for this provider
    if (
      taskWithSync.externalTaskId &&
      taskWithSync.source === mapping.provider.type
    ) {
      return;
    }

    // Convert to the provider's format
    const taskToCreate = fieldMapper.mapToExternalTask(taskWithSync);

    // Create the task in the external system
    const createdTask = await provider.createTask(
      mapping.externalListId,
      taskToCreate
    );

    // Update the local task with the external ID
    await prisma.task.update({
      where: { id: task.id },
      data: {
        externalTaskId: createdTask.id,
        externalListId: mapping.externalListId,
        source: mapping.provider.type,
        externalUpdatedAt: createdTask.lastModified
          ? newDate(createdTask.lastModified)
          : createdTask.lastModifiedDateTime
            ? newDate(createdTask.lastModifiedDateTime)
            : new Date(),
        lastSyncedAt: newDate(),
        syncStatus: "SYNCED",
        syncHash: new TaskChangeTracker().generateTaskHash(taskWithSync),
      },
    });
  }

  /**
   * Process an UPDATE change
   */
  private async processUpdateChange(
    taskId: string,
    provider: TaskProviderInterface,
    mapping: TaskListMapping & { provider: DbTaskProvider },
    fieldMapper: FieldMapper
  ): Promise<void> {
    if (taskId === null) return; // This can happen if the task was deleted
    // Get the task details
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        tags: true,
        project: true,
      },
    });

    if (!task) {
      throw new Error(`Task ${taskId} not found for UPDATE change`);
    }

    // Convert to TaskWithSync
    const taskWithSync = {
      ...task,
      tags: task.tags || [],
      project: task.project || null,
      isRecurring: task.isRecurring || false,
      isAutoScheduled: task.isAutoScheduled || false,
      scheduleLocked: task.scheduleLocked || false,
    } as unknown as TaskWithSync;

    // Skip tasks that don't have an external ID for this provider
    if (
      !taskWithSync.externalTaskId ||
      taskWithSync.source !== mapping.provider.type
    ) {
      return;
    }

    // Map the local task to the provider's format
    const taskToUpdate = fieldMapper.mapToExternalTaskUpdates(taskWithSync);

    // Update the task in the external system
    const updatedTask = await provider.updateTask(
      mapping.externalListId,
      taskWithSync.externalTaskId as string,
      taskToUpdate
    );

    // Update the local task with sync metadata
    await prisma.task.update({
      where: { id: task.id },
      data: {
        externalUpdatedAt: updatedTask.lastModified
          ? newDate(updatedTask.lastModified)
          : updatedTask.lastModifiedDateTime
            ? newDate(updatedTask.lastModifiedDateTime)
            : new Date(),
        lastSyncedAt: newDate(),
        syncStatus: "SYNCED",
        syncHash: new TaskChangeTracker().generateTaskHash(taskWithSync),
      },
    });
  }

  /**
   * Process a DELETE change
   */
  private async processDeleteChange(
    change: {
      id: string;
      taskId: string | null;
      changeData?: Record<string, unknown> | null;
    },
    provider: TaskProviderInterface
  ): Promise<void> {
    const changeData = change.changeData as Record<string, unknown>;
    const externalTaskId = changeData.externalTaskId as string | undefined;
    const externalListId = changeData.externalListId as string | undefined;
    // Skip tasks that don't have an external ID for this provider
    if (!externalTaskId || !externalListId) {
      return;
    }

    // Delete the task from the external system
    try {
      await provider.deleteTask(externalListId, externalTaskId);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Item not found")) {
        // The task was already deleted, so we don't need to do anything
        return;
      }
      logger.error(
        `Failed to delete task in external system`,
        { error: error instanceof Error ? error.message : "Unknown error" },
        LOG_SOURCE
      );
      throw error;
    }
    // Note: We don't delete the local task here because it should have already
    // been deleted when the DELETE change was tracked
  }

  /**
   * Find a matching local task based on title and other properties
   */
  private findMatchingLocalTask(
    externalTask: ExternalTask,
    localTasks: TaskWithSync[]
  ): TaskWithSync | undefined {
    // Find a match based on title (case-insensitive) as the primary match criteria
    return localTasks.find((localTask) => {
      const titleMatch =
        localTask.title.toLowerCase() ===
        (externalTask.title || "").toLowerCase();

      // Use due date as a secondary match criterion
      let dueDateMatch = true;
      if (localTask.dueDate && externalTask.dueDate) {
        const localDate = newDate(localTask.dueDate)
          .toISOString()
          .split("T")[0];
        const externalDate = newDate(externalTask.dueDate)
          .toISOString()
          .split("T")[0];
        dueDateMatch = localDate === externalDate;
      }

      return titleMatch && dueDateMatch;
    });
  }

  /**
   * Link a local task to an external task
   */
  private async linkTasks(
    localTask: TaskWithSync,
    externalTask: ExternalTask,
    mapping: TaskListMapping & { provider: DbTaskProvider },
    providerType: string
  ): Promise<void> {
    await prisma.task.update({
      where: { id: localTask.id },
      data: {
        externalTaskId: externalTask.id,
        externalListId: mapping.externalListId,
        source: providerType,
        lastSyncedAt: newDate(),
        syncStatus: "SYNCED",
        externalUpdatedAt: externalTask.lastModified
          ? newDate(externalTask.lastModified)
          : externalTask.lastModifiedDateTime
            ? newDate(externalTask.lastModifiedDateTime)
            : new Date(),
      },
    });
  }

  /**
   * Resolve conflicts between local and external task versions
   */
  private async resolveTaskConflict(
    localTask: TaskWithSync,
    externalTask: ExternalTask,
    provider: TaskProviderInterface,
    mapping: TaskListMapping & { provider: DbTaskProvider },
    fieldMapper: FieldMapper
  ): Promise<void> {
    // Get timestamps to compare
    const localUpdatedAt = localTask.updatedAt;
    const externalUpdatedAt = externalTask.lastModified
      ? newDate(externalTask.lastModified)
      : externalTask.lastModifiedDateTime
        ? newDate(externalTask.lastModifiedDateTime)
        : new Date();

    // Map external task to internal format
    const mappedExternalTask = fieldMapper.mapToInternalTask(
      externalTask,
      mapping.projectId
    );

    // Compare timestamps to decide which version to use
    if (
      !localTask.externalUpdatedAt ||
      (externalUpdatedAt && externalUpdatedAt > localTask.externalUpdatedAt)
    ) {
      // External is newer - update local with external data
      // But preserve any local fields that weren't changed in external

      // Merge the tasks
      const mergedData = fieldMapper.mergeTaskData(
        localTask,
        mappedExternalTask
      );

      // Extract and remove nested objects that can't be used directly in the update
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { tags, project, ...updateData } = mergedData;

      // Update local task with the merged data
      await prisma.task.update({
        where: { id: localTask.id },
        data: {
          // Use type assertion to handle the TaskUpdateInput type
          ...updateData,
          externalUpdatedAt: externalUpdatedAt,
          lastSyncedAt: newDate(),
          syncStatus: "SYNCED",
          syncHash: new TaskChangeTracker().generateTaskHash(localTask),
        },
      });
    } else if (localUpdatedAt > (localTask.externalUpdatedAt || new Date(0))) {
      // Local is newer - update external with local data
      logger.debug(
        `Local task ${localTask.id} is newer, updating external task`,
        {
          localUpdatedAt: localTask.updatedAt.toISOString(),
          externalUpdatedAt: externalUpdatedAt.toISOString(),
          taskId: localTask.id,
          externalTaskId: localTask.externalTaskId || null,
        },
        LOG_SOURCE
      );

      // Update the external task with the local data
      const updatedTask = await provider.updateTask(
        mapping.externalListId,
        localTask.externalTaskId as string,
        fieldMapper.mapToExternalTaskUpdates(localTask)
      );

      // Update local task's external metadata
      await prisma.task.update({
        where: { id: localTask.id },
        data: {
          externalUpdatedAt: updatedTask.lastModified
            ? newDate(updatedTask.lastModified)
            : updatedTask.lastModifiedDateTime
              ? newDate(updatedTask.lastModifiedDateTime)
              : new Date(),
          lastSyncedAt: newDate(),
          syncStatus: "SYNCED",
          syncHash: new TaskChangeTracker().generateTaskHash(localTask),
        },
      });
    }
    // If timestamps are equal, no update needed
  }
}
