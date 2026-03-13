/**
 * TaskProviderInterface
 *
 * This interface defines the contract that all task provider implementations must follow.
 * It serves as the foundation for our task synchronization system, enabling a consistent way
 * to interact with various external task services (Outlook, Asana, CalDAV, etc.)
 */
import { Task } from "@/types/task";

/**
 * Represents a task list/project in an external system
 */
export interface ExternalTaskList {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isDefault?: boolean;
  path?: string; // For hierarchical providers
  parentId?: string; // For nested lists
}

/**
 * Represents a task from an external system
 */
export interface ExternalTask {
  id: string;
  title: string;
  description?: string | null;
  status?: string;
  priority?: string;
  dueDate?: Date | null;
  startDate?: Date | null;
  completedDate?: Date | null;
  listId: string;
  isRecurring?: boolean;
  recurrenceRule?: string | null;
  tags?: string[];
  lastModified?: Date;
  lastModifiedDateTime?: string;
  url?: string;
}

/**
 * Represents a task that should be created in an external system
 */
export interface TaskToCreate {
  title: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  dueDate?: Date | null;
  startDate?: Date | null;
  recurrenceRule?: string | null;
}

/**
 * Parameters for updating a task in an external system
 */
export interface TaskUpdates {
  title?: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  dueDate?: Date | null;
  startDate?: Date | null;
  duration?: number | null;
  completedDate?: Date | null;
  recurrenceRule?: string | null;
  // Additional fields needed by provider
  metadata?: Record<string, unknown>;
}

/**
 * Filtering options for task sync operations
 */
export interface SyncOptions {
  includeCompleted?: boolean;
  since?: Date;
  until?: Date;
  statuses?: string[];
  limit?: number;
}

/**
 * Represents a change to a task in either direction
 */
export interface TaskChange {
  id: string;
  taskId: string;
  listId: string;
  type: "CREATE" | "UPDATE" | "DELETE";
  timestamp: Date;
  changes?: Record<string, unknown>;
}

/**
 * Interface that all task providers must implement
 */
export interface TaskProviderInterface {
  /**
   * Returns the provider type identifier (e.g., "OUTLOOK", "ASANA", "CALDAV")
   */
  getType(): string;

  /**
   * Returns a human-readable name for the provider
   */
  getName(): string;

  /**
   * Gets all available task lists from the external service
   */
  getTaskLists(): Promise<ExternalTaskList[]>;

  /**
   * Gets all tasks from a specific list in the external service
   *
   * @param listId The ID of the task list to fetch tasks from
   * @param options Optional filtering parameters
   */
  getTasks(listId: string, options?: SyncOptions): Promise<ExternalTask[]>;

  /**
   * Creates a new task in the external service
   *
   * @param listId The ID of the task list to create the task in
   * @param task The task data to create
   */
  createTask(listId: string, task: TaskToCreate): Promise<ExternalTask>;

  /**
   * Updates an existing task in the external service
   *
   * @param listId The ID of the task list the task belongs to
   * @param taskId The ID of the task to update
   * @param updates The task data to update
   */
  updateTask(
    listId: string,
    taskId: string,
    updates: TaskUpdates
  ): Promise<ExternalTask>;

  /**
   * Deletes a task from the external service
   *
   * @param listId The ID of the task list the task belongs to
   * @param taskId The ID of the task to delete
   */
  deleteTask(listId: string, taskId: string): Promise<void>;

  /**
   * Gets changes to tasks since a specific time
   *
   * @param listId The ID of the task list to get changes for
   * @param since Optional timestamp to get changes since
   */
  getChanges(listId: string, since?: Date): Promise<TaskChange[]>;

  /**
   * Validates that the provider connection is working correctly
   */
  validateConnection(): Promise<boolean>;

  /**
   * Maps an external task to our internal Task model
   *
   * @param externalTask The external task to map
   * @param projectId The ID of the project to associate the task with
   */
  mapToInternalTask(
    externalTask: ExternalTask,
    projectId: string
  ): Partial<Task>;

  /**
   * Maps an internal task to the format expected by the external service
   *
   * @param task The internal task to map
   */
  mapToExternalTask(task: Partial<Task>): TaskToCreate;
}
