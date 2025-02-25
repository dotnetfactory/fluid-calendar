import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FocusMode, FocusTask } from "@/types/focus";
import { addHours, addDays, newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { useTaskStore } from "@/store/task";
import { TaskStatus } from "@/types/task";
import { ActionType } from "@/components/ui/action-overlay";

const LOG_SOURCE = "focusMode";

// Extended state to include processing information
interface ProcessingState {
  isProcessing: boolean;
  actionType: ActionType | null;
  actionMessage: string | null;
}

// Initial state that maintains the same interface but removes session stats
const initialState: FocusMode & ProcessingState = {
  currentTaskId: null,
  isProcessing: false,
  actionType: null,
  actionMessage: null,
};

interface FocusModeStore extends FocusMode, ProcessingState {
  // State getters
  getCurrentTask: () => FocusTask | null;
  getQueuedTasks: () => FocusTask[];
  getQueuedTaskIds: () => string[];

  // Processing state actions
  startProcessing: (actionType: ActionType, message?: string) => void;
  stopProcessing: () => void;

  // Actions
  completeCurrentTask: () => void;
  switchToTask: (taskId: string) => void;
  postponeTask: (duration: string) => void;
}

export const useFocusModeStore = create<FocusModeStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Processing state actions
      startProcessing: (actionType: ActionType, message?: string) => {
        logger.debug(
          "[FocusMode] Starting processing",
          { actionType, message: message || null },
          LOG_SOURCE
        );
        set({
          isProcessing: true,
          actionType,
          actionMessage: message || null,
        });
      },

      stopProcessing: () => {
        logger.debug("[FocusMode] Stopping processing", {}, LOG_SOURCE);
        set({
          isProcessing: false,
          actionType: null,
          actionMessage: null,
        });
      },

      getCurrentTask: () => {
        const state = get();
        const currentId = state.currentTaskId;

        // If we don't have a current task ID, return null
        if (!currentId) return null;

        // Find the current task in the task store
        const task = useTaskStore
          .getState()
          .tasks.find((t) => t.id === currentId);

        // If task not found or is postponed, return null
        if (!task) return null;
        if (task.postponedUntil && newDate(task.postponedUntil) > newDate())
          return null;

        // Convert to FocusTask
        return {
          ...task,
          focusScore: task.scheduleScore || 0,
          lastFocusedAt: null,
          focusTimeSpent: 0,
        } as unknown as FocusTask;
      },

      getQueuedTasks: () => {
        logger.debug("[FocusMode] Getting queued tasks", {}, LOG_SOURCE);
        const tasks = useTaskStore.getState().tasks;
        const currentTaskId = get().currentTaskId;

        if (!tasks || tasks.length === 0) {
          logger.debug("[FocusMode] No tasks available", {}, LOG_SOURCE);
          return [];
        }

        // Filter for tasks that are:
        // 1. Not completed
        // 2. Not postponed
        // 3. Include the current task (we'll filter it out later if needed)
        const availableTasks = tasks.filter(
          (task) =>
            task.status !== TaskStatus.COMPLETED &&
            (!task.postponedUntil || newDate(task.postponedUntil) <= newDate())
        );

        // Log if current task is in available tasks
        if (currentTaskId) {
          const currentTaskAvailable = availableTasks.some(
            (task) => task.id === currentTaskId
          );
          logger.debug(
            "[FocusMode] Current task availability",
            {
              currentTaskId,
              isAvailable: currentTaskAvailable,
            },
            LOG_SOURCE
          );
        }

        // Sort by scheduled start time (earliest first)
        const sortedTasks = [...availableTasks].sort((a, b) => {
          if (!a.scheduledStart && !b.scheduledStart) return 0;
          if (!a.scheduledStart) return 1;
          if (!b.scheduledStart) return -1;
          return (
            newDate(a.scheduledStart).getTime() -
            newDate(b.scheduledStart).getTime()
          );
        });

        // Take top 3 tasks
        const topTasks = sortedTasks.slice(0, 3);

        logger.debug(
          "[FocusMode] Sorted and filtered tasks",
          {
            totalTasks: tasks.length,
            availableTasks: availableTasks.length,
            topTasksCount: topTasks.length,
            topTaskIds: topTasks.map((t) => t.id),
          },
          LOG_SOURCE
        );

        // Convert to FocusTasks
        return topTasks.map((task) => ({
          ...task,
          focusScore: task.scheduleScore || 0,
          lastFocusedAt: null,
          focusTimeSpent: 0,
        })) as unknown as FocusTask[];
      },

      getQueuedTaskIds: () => {
        const currentTaskId = get().currentTaskId;
        const queuedTasks = get().getQueuedTasks();

        // Filter out the current task from the queued tasks
        return queuedTasks
          .filter((task) => task.id !== currentTaskId)
          .map((task) => task.id);
      },

      completeCurrentTask: () => {
        logger.debug("[FocusMode] Completing current task", {}, LOG_SOURCE);
        const state = get();
        const currentTaskId = state.currentTaskId;

        if (!currentTaskId) {
          logger.warn(
            "[FocusMode] Cannot complete task - no current task",
            {},
            LOG_SOURCE
          );
          return;
        }

        // Show loading overlay
        get().startProcessing("celebration", "Task completed! 🎉");

        // First update the task status in the database
        const taskStore = useTaskStore.getState();

        // Update task in the database - using the async/await pattern through
        // an immediately invoked async function
        (async () => {
          try {
            logger.info(
              "[FocusMode] Marking task as completed in database",
              {
                taskId: currentTaskId,
              },
              LOG_SOURCE
            );

            // Handle case where task is recurring but missing recurrence rule
            const updates = {
              status: TaskStatus.COMPLETED,
            };

            await taskStore.updateTask(currentTaskId, updates);
            // Show celebration overlay
            logger.debug(
              "[FocusMode] Task successfully marked as completed in database",
              {
                taskId: currentTaskId,
              },
              LOG_SOURCE
            );

            // Refresh tasks to make sure our tasks list is up-to-date
            await taskStore.fetchTasks();
            // Wait for celebration to finish (3 seconds)
            // Move to next task if available
            const queuedTaskIds = get().getQueuedTaskIds();
            const nextTaskId = queuedTaskIds[0];
            set({
              currentTaskId: nextTaskId || null,
            });
            get().stopProcessing();
          } catch (error) {
            // Show error overlay
            get().startProcessing(
              "error",
              "Error completing task. Please try again."
            );

            // Hide error after 3 seconds
            setTimeout(() => {
              get().stopProcessing();
            }, 3000);

            console.error(
              "Error handling task completion:",
              error instanceof Error ? error.message : String(error)
            );
          }
        })();
      },

      switchToTask: (taskId: string) => {
        logger.debug("[FocusMode] Switching to task", { taskId }, LOG_SOURCE);

        // Show loading overlay
        get().startProcessing("loading", "Switching tasks...");

        // Use setTimeout to give the UI time to update
        setTimeout(() => {
          set({
            currentTaskId: taskId,
          });
          get().stopProcessing();
        }, 500);
      },

      postponeTask: (duration: string) => {
        logger.debug("[FocusMode] Postponing task", { duration }, LOG_SOURCE);
        const state = get();
        const currentTaskId = state.currentTaskId;

        if (!currentTaskId) {
          logger.warn(
            "[FocusMode] Cannot postpone task - no current task",
            {},
            LOG_SOURCE
          );
          return;
        }

        // Show loading overlay
        get().startProcessing("loading", `Postponing task for ${duration}...`);

        // First update the task in the database
        const taskStore = useTaskStore.getState();

        // Calculate the postpone until time based on duration
        let postponedUntil = newDate();
        switch (duration) {
          case "1h":
            postponedUntil = addHours(postponedUntil, 1);
            break;
          case "3h":
            postponedUntil = addHours(postponedUntil, 3);
            break;
          case "1d":
            postponedUntil = addDays(postponedUntil, 1);
            break;
          default:
            postponedUntil = addHours(postponedUntil, 1); // Default to 1 hour
        }

        // Update task in the database
        (async () => {
          try {
            logger.info(
              "[FocusMode] Postponing task in database",
              {
                taskId: currentTaskId,
                duration,
                postponedUntil: postponedUntil.toDateString(),
              },
              LOG_SOURCE
            );

            const updates = {
              postponedUntil: postponedUntil,
            };

            await taskStore.updateTask(currentTaskId, updates);

            logger.debug(
              "[FocusMode] Task successfully postponed until " +
                postponedUntil.toISOString(),
              {
                taskId: currentTaskId,
                duration,
              },
              LOG_SOURCE
            );

            // Refresh tasks to make sure our tasks list is up-to-date
            await taskStore.fetchTasks();

            // Move to next task if available
            const queuedTaskIds = get().getQueuedTaskIds();
            const nextTaskId = queuedTaskIds[0];
            set({
              currentTaskId: nextTaskId || null,
            });
            get().stopProcessing();
          } catch (error) {
            // Show error overlay
            get().startProcessing(
              "error",
              "Error postponing task. Please try again."
            );

            // Hide error after 3 seconds
            setTimeout(() => {
              get().stopProcessing();
            }, 3000);

            console.error(
              "Error handling task postponing:",
              error instanceof Error ? error.message : String(error)
            );
          }
        })();
      },
    }),
    {
      name: "focus-mode-storage",
      partialize: (state) => ({
        currentTaskId: state.currentTaskId,
        // Don't persist processing state
      }),
    }
  )
);
