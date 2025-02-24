import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_FOCUS_MODE,
  FocusMode,
  FocusStatus,
  FocusTask,
} from "@/types/focus";
import { newDate, differenceInMinutes } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { useTaskStore } from "@/store/task";
import { TaskStatus } from "@/types/task";

const LOG_SOURCE = "focusMode";
interface FocusModeStore extends FocusMode {
  // State getters
  getStatus: () => FocusStatus;
  getCurrentTask: () => FocusTask | null;
  getQueuedTasks: () => FocusTask[];

  // Actions
  startFocusMode: (tasks: FocusTask[]) => void;
  endFocusMode: () => void;
  pauseFocusMode: () => void;
  resumeFocusMode: () => void;
  completeCurrentTask: () => void;
  switchToTask: (taskId: string) => void;
  updateSessionStats: () => void;
}

export const useFocusModeStore = create<FocusModeStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_FOCUS_MODE,

      // State getters
      getStatus: () => {
        const state = get();
        if (!state.isActive) return FocusStatus.INACTIVE;
        if (!state.sessionStartTime) return FocusStatus.PAUSED;
        if (state.sessionStats.sessionEnd) return FocusStatus.COMPLETED;
        return FocusStatus.ACTIVE;
      },

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
          externalTaskId: task.id,
          source: "local",
          lastSyncedAt: newDate(),
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
            externalTaskId: task.id,
            source: "local",
            lastSyncedAt: newDate(),
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
        const now = newDate();
        set({
          isActive: true,
          sessionStartTime: now,
          currentTaskId: tasks[0]?.id || null,
          queuedTaskIds: tasks.slice(1).map((t) => t.id),
          sessionStats: {
            tasksCompleted: 0,
            timeSpent: 0,
            sessionStart: now,
            sessionEnd: null,
          },
        });
      },

      endFocusMode: () => {
        logger.debug("[FocusMode] Ending focus mode", {}, LOG_SOURCE);
        const state = get();
        state.updateSessionStats();
        set({
          ...DEFAULT_FOCUS_MODE,
          sessionStats: {
            ...state.sessionStats,
            sessionEnd: newDate(),
          },
        });
      },

      pauseFocusMode: () => {
        logger.debug("[FocusMode] Pausing focus mode", {}, LOG_SOURCE);
        const state = get();
        state.updateSessionStats();
        set({ sessionStartTime: null });
      },

      resumeFocusMode: () => {
        logger.debug("[FocusMode] Resuming focus mode", {}, LOG_SOURCE);
        set({ sessionStartTime: newDate() });
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

            await taskStore.updateTask(currentTaskId, {
              status: TaskStatus.COMPLETED,
              lastCompletedDate: newDate(),
            });

            logger.debug(
              "[FocusMode] Task successfully marked as completed in database",
              {
                taskId: currentTaskId,
              },
              LOG_SOURCE
            );

            // Refresh tasks to make sure our tasks list is up-to-date
            await taskStore.fetchTasks();
          } catch (error) {
            logger.error(
              "[FocusMode] Failed to mark task as completed in database",
              {
                taskId: currentTaskId,
                error: error instanceof Error ? error.message : String(error),
              },
              LOG_SOURCE
            );
          }
        })();

        // Update stats for the focus session
        state.updateSessionStats();

        // Move to next task if available
        const nextTaskId = state.queuedTaskIds[0];
        set((state) => ({
          currentTaskId: nextTaskId || null,
          queuedTaskIds: state.queuedTaskIds.slice(1),
          sessionStats: {
            ...state.sessionStats,
            tasksCompleted: state.sessionStats.tasksCompleted + 1,
          },
        }));

        // End session if no more tasks
        if (!nextTaskId) {
          state.endFocusMode();
        }
      },

      switchToTask: (taskId: string) => {
        logger.debug("[FocusMode] Switching to task", { taskId }, LOG_SOURCE);
        const state = get();
        state.updateSessionStats();

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

      updateSessionStats: () => {
        const state = get();
        if (!state.sessionStartTime) return;

        const timeSpent = differenceInMinutes(
          newDate(),
          state.sessionStartTime
        );
        set((state) => ({
          sessionStats: {
            ...state.sessionStats,
            timeSpent: state.sessionStats.timeSpent + timeSpent,
          },
        }));
      },
    }),
    {
      name: "focus-mode-storage",
      partialize: (state) => ({
        isActive: state.isActive,
        currentTaskId: state.currentTaskId,
        queuedTaskIds: state.queuedTaskIds,
        sessionStartTime: state.sessionStartTime,
        sessionStats: state.sessionStats,
      }),
    }
  )
);
