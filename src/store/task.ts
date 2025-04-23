import { create } from "zustand";
import { persist } from "zustand/middleware";

import { isSaasEnabled } from "@/lib/config";

import {
  NewTag,
  NewTask,
  Tag,
  Task,
  TaskFilters,
  UpdateTask,
} from "@/types/task";

interface TaskState {
  tasks: Task[];
  tags: Tag[];
  filters: TaskFilters;
  loading: boolean;
  error: Error | null;

  // Task actions
  fetchTasks: () => Promise<void>;
  createTask: (task: NewTask) => Promise<Task>;
  updateTask: (id: string, updates: UpdateTask) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  setFilters: (filters: Partial<TaskFilters>) => void;

  // Tag actions
  fetchTags: () => Promise<void>;
  createTag: (tag: NewTag) => Promise<Tag>;
  updateTag: (id: string, updates: Partial<NewTag>) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;

  // Project actions
  assignToProject: (taskId: string, projectId: string | null) => Promise<Task>;
  bulkAssignToProject: (
    taskIds: string[],
    projectId: string | null
  ) => Promise<void>;

  // Auto-scheduling actions
  scheduleAllTasks: () => Promise<void>;
  triggerScheduleAllTasks: () => Promise<void>;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      tags: [],
      filters: {},
      loading: false,
      error: null,

      // Task actions
      fetchTasks: async () => {
        set({ loading: true, error: null });
        try {
          const { filters } = get();
          const params = new URLSearchParams();

          if (filters.status?.length) {
            filters.status.forEach((s) => params.append("status", s));
          }
          if (filters.tagIds?.length) {
            filters.tagIds.forEach((id) => params.append("tagIds", id));
          }
          if (filters.projectId) {
            params.append("projectId", filters.projectId);
          }
          if (filters.search) {
            params.append("search", filters.search);
          }
          if (filters.energyLevel?.length) {
            filters.energyLevel.forEach((level) =>
              params.append("energyLevel", level)
            );
          }
          if (filters.timePreference?.length) {
            filters.timePreference.forEach((pref) =>
              params.append("timePreference", pref)
            );
          }

          const response = await fetch(`/api/tasks?${params.toString()}`);
          if (!response.ok) throw new Error("Failed to fetch tasks");
          const tasks = await response.json();
          set({ tasks });
        } catch (error) {
          set({ error: error as Error });
        } finally {
          set({ loading: false });
        }
      },

      createTask: async (task: NewTask) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(task),
          });
          if (!response.ok) throw new Error("Failed to create task");
          const newTask = await response.json();
          set((state) => ({ tasks: [...state.tasks, newTask] }));
          await get().triggerScheduleAllTasks();
          return newTask;
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      updateTask: async (id: string, updates: UpdateTask) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/tasks/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to update task: ${errorText}`);
          }

          const updatedTask = await response.json();
          set((state) => ({
            tasks: state.tasks.map((task) =>
              task.id === id ? updatedTask : task
            ),
          }));
          await get().triggerScheduleAllTasks();
          return updatedTask;
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      deleteTask: async (id: string) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/tasks/${id}`, {
            method: "DELETE",
          });
          if (!response.ok) throw new Error("Failed to delete task");
          set((state) => ({
            tasks: state.tasks.filter((task) => task.id !== id),
          }));
          await get().triggerScheduleAllTasks();
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      setFilters: (filters: Partial<TaskFilters>) => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
        }));
      },

      // Tag actions
      fetchTags: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch("/api/tags");
          if (!response.ok) throw new Error("Failed to fetch tags");
          const tags = await response.json();
          set({ tags });
        } catch (error) {
          set({ error: error as Error });
        } finally {
          set({ loading: false });
        }
      },

      createTag: async (tag: NewTag) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch("/api/tags", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(tag),
          });
          if (!response.ok) throw new Error("Failed to create tag");
          const newTag = await response.json();
          set((state) => ({ tags: [...state.tags, newTag] }));
          return newTag;
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      updateTag: async (id: string, updates: Partial<NewTag>) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/tags/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          });
          if (!response.ok) throw new Error("Failed to update tag");
          const updatedTag = await response.json();
          set((state) => ({
            tags: state.tags.map((tag) => (tag.id === id ? updatedTag : tag)),
          }));
          return updatedTag;
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      deleteTag: async (id: string) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/tags/${id}`, {
            method: "DELETE",
          });
          if (!response.ok) throw new Error("Failed to delete tag");
          set((state) => ({
            tags: state.tags.filter((tag) => tag.id !== id),
          }));
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      assignToProject: async (taskId: string, projectId: string | null) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/tasks/${taskId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId }),
          });
          if (!response.ok) throw new Error("Failed to assign task to project");
          const updatedTask = await response.json();
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === taskId ? updatedTask : t)),
          }));
          await get().triggerScheduleAllTasks();
          return updatedTask;
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      bulkAssignToProject: async (
        taskIds: string[],
        projectId: string | null
      ) => {
        set({ loading: true, error: null });
        try {
          await Promise.all(
            taskIds.map((taskId) =>
              fetch(`/api/tasks/${taskId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId }),
              })
            )
          );
          await get().fetchTasks(); // Refresh task list
          await get().triggerScheduleAllTasks();
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      triggerScheduleAllTasks: async () => {
        set({ loading: true, error: null });
        try {
          // For open source version, call scheduleAllTasks directly
          if (!isSaasEnabled) {
            await get().scheduleAllTasks();
            return;
          }

          // For SAAS version, use the background job queue
          const jobResponse = await fetch("/api/tasks/schedule-all/queue", {
            method: "POST",
          });

          if (!jobResponse.ok) {
            throw new Error("Failed to queue task scheduling job");
          }

          // Set up SSE connection if not already connected
          if (
            !window.taskScheduleSSE ||
            window.taskScheduleSSE.readyState === 2
          ) {
            const setupSSE = () => {
              // Close existing connection if it exists but is in a closed state
              if (window.taskScheduleSSE) {
                window.taskScheduleSSE.close();
              }

              const eventSource = new EventSource("/api/sse");

              eventSource.onmessage = (event) => {
                try {
                  const data = JSON.parse(event.data);
                  if (data.type === "TASK_SCHEDULE_COMPLETE") {
                    get().fetchTasks();
                    // Dispatch a custom event for the NotificationProvider
                    window.dispatchEvent(
                      new CustomEvent("task-schedule-complete", {
                        detail: data,
                      })
                    );
                  }
                } catch (error) {
                  console.error(
                    "Error parsing SSE message in task store:",
                    error
                  );
                }
              };

              eventSource.onerror = () => {
                console.error("SSE connection error");
                eventSource.close();
                // Try to reconnect after a delay
                setTimeout(setupSSE, 5000);
              };

              window.taskScheduleSSE = eventSource;
            };

            setupSSE();
          }
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      // Auto-scheduling actions
      scheduleAllTasks: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch("/api/tasks/schedule-all", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          if (!response.ok) throw new Error("Failed to schedule tasks");
          const updatedTasks = await response.json();

          // Get current tasks from store
          const currentTasks = get().tasks;

          // Create a map of updated tasks by ID for efficient lookup
          const updatedTasksMap = new Map(
            updatedTasks.map((task: Task) => [task.id, task])
          );

          // Merge updated tasks with existing tasks
          const mergedTasks = currentTasks.map((task) =>
            updatedTasksMap.has(task.id) ? updatedTasksMap.get(task.id)! : task
          ) as Task[];

          set({ tasks: mergedTasks });
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },
    }),
    {
      name: "task-data-storage",
      partialize: (state) => ({
        tasks: state.tasks,
        tags: state.tags,
      }),
    }
  )
);
