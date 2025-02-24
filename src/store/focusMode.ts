import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FocusMode, FocusTask } from "@/types/focus";
import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { useTaskStore } from "@/store/task";
import { TaskStatus } from "@/types/task";

const LOG_SOURCE = "focusMode";

// Initial state that maintains the same interface but removes session stats
const initialState: FocusMode = {
  currentTaskId: null,
  queuedTaskIds: [],
};

interface FocusModeStore extends FocusMode {
  // State getters
  getCurrentTask: () => FocusTask | null;
  getQueuedTasks: () => FocusTask[];

  // Actions
  startFocusMode: (tasks: FocusTask[]) => void;
  endFocusMode: () => void;
  pauseFocusMode: () => void;
  resumeFocusMode: () => void;
  completeCurrentTask: () => void;
  switchToTask: (taskId: string) => void;
  refreshTasks: () => void; // New function to ensure we have 3 tasks
}

export const useFocusModeStore = create<FocusModeStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      getCurrentTask: () => {
        const state = get();
        if (!state.currentTaskId) return null;

        // Find the current task in the task store
        const task = useTaskStore
          .getState()
          .tasks.find((t) => t.id === state.currentTaskId);
        if (!task) return null;

        // Convert to FocusTask
        return {
          ...task,
          focusScore: task.scheduleScore || 0,
          lastFocusedAt: null,
          focusTimeSpent: 0,
        } as unknown as FocusTask;
      },

      getQueuedTasks: () => {
        const state = get();
        const tasks = useTaskStore.getState().tasks;

        // Map task IDs to tasks
        return state.queuedTaskIds
          .map((id) => tasks.find((t) => t.id === id))
          .filter(
            (task): task is NonNullable<typeof task> => task !== undefined
          )
          .map((task) => ({
            ...task,
            focusScore: task.scheduleScore || 0,
            lastFocusedAt: null,
            focusTimeSpent: 0,
          })) as unknown as FocusTask[];
      },

      // Actions
      startFocusMode: (tasks: FocusTask[]) => {
        logger.debug(
          "[FocusMode] Starting focus mode",
          {
            taskCount: tasks.length,
          },
          LOG_SOURCE
        );

        set({
          currentTaskId: tasks[0]?.id || null,
          queuedTaskIds: tasks.slice(1).map((t) => t.id),
        });
      },

      endFocusMode: () => {
        logger.debug("[FocusMode] Ending focus mode", {}, LOG_SOURCE);
        set(initialState);
      },

      pauseFocusMode: () => {
        logger.debug(
          "[FocusMode] Pause function called (no-op)",
          {},
          LOG_SOURCE
        );
        // Do nothing - we're removing session management
      },

      resumeFocusMode: () => {
        logger.debug(
          "[FocusMode] Resume function called (no-op)",
          {},
          LOG_SOURCE
        );
        // Do nothing - we're removing session management
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

            logger.debug(
              "[FocusMode] Task successfully marked as completed in database",
              {
                taskId: currentTaskId,
              },
              LOG_SOURCE
            );

            // Refresh tasks to make sure our tasks list is up-to-date
            await taskStore.fetchTasks();

            // Ensure we always have 3 tasks in focus mode
            state.refreshTasks();
          } catch (error) {
            console.error(
              "Error handling task completion:",
              error instanceof Error ? error.message : String(error)
            );
          }
        })();

        // Move to next task if available
        const nextTaskId = state.queuedTaskIds[0];
        set((state) => ({
          currentTaskId: nextTaskId || null,
          queuedTaskIds: state.queuedTaskIds.slice(1),
        }));

        // If no more tasks and we're still active, ensure we get more tasks
          get().refreshTasks();
      },

      switchToTask: (taskId: string) => {
        logger.debug("[FocusMode] Switching to task", { taskId }, LOG_SOURCE);
        const state = get();

        // Update queue by moving current task to queue and removing switched task from queue
        const currentTaskId = state.currentTaskId;
        const newQueuedTaskIds = currentTaskId
          ? [
              currentTaskId,
              ...state.queuedTaskIds.filter((id) => id !== taskId),
            ]
          : state.queuedTaskIds.filter((id) => id !== taskId);

        set({
          currentTaskId: taskId,
          queuedTaskIds: newQueuedTaskIds,
        });
      },

      // New function to ensure we always have 3 tasks in focus mode
      refreshTasks: () => {
        const state = get();
        const taskStore = useTaskStore.getState();

        // Get current number of tasks in focus mode
        const currentCount =
          (state.currentTaskId ? 1 : 0) + state.queuedTaskIds.length;

        // If we already have 3 or more tasks, no need to refresh
        if (currentCount >= 3) {
          return;
        }

        // Get additional tasks needed
        const tasksNeeded = 3 - currentCount;

        logger.debug(
          "[FocusMode] Refreshing tasks, need to add more tasks",
          { tasksNeeded },
          LOG_SOURCE
        );

        // Get existing task IDs to avoid duplicates
        const existingTaskIds = new Set([
          ...(state.currentTaskId ? [state.currentTaskId] : []),
          ...state.queuedTaskIds,
        ]);

        // Get top tasks by scheduled start time
        const additionalTasks = taskStore.tasks
          .filter(
            (task) =>
              task.status !== TaskStatus.COMPLETED &&
              task.scheduledStart !== null &&
              !existingTaskIds.has(task.id)
          )
          .sort((a, b) => {
            if (!a.scheduledStart) return 1;
            if (!b.scheduledStart) return -1;
            return (
              newDate(a.scheduledStart).getTime() -
              newDate(b.scheduledStart).getTime()
            );
          })
          .slice(0, tasksNeeded);

        if (additionalTasks.length > 0) {
          logger.info(
            "[FocusMode] Adding new tasks to focus queue",
            {
              count: additionalTasks.length,
              taskIds: additionalTasks.map((t) => t.id),
            },
            LOG_SOURCE
          );

          // Add to queued tasks
          set((state) => ({
            queuedTaskIds: [
              ...state.queuedTaskIds,
              ...additionalTasks.map((t) => t.id),
            ],
          }));

          // If we don't have a current task but have added tasks, make the first one current
          if (!state.currentTaskId && additionalTasks.length > 0) {
            set({ currentTaskId: additionalTasks[0].id });
            // Remove it from the queue since it's now the current task
            set((state) => ({
              queuedTaskIds: state.queuedTaskIds.filter(
                (id) => id !== additionalTasks[0].id
              ),
            }));
          }
        }
      },
    }),
    {
      name: "focus-mode-storage",
      partialize: (state) => ({
        currentTaskId: state.currentTaskId,
        queuedTaskIds: state.queuedTaskIds,
      }),
    }
  )
);
