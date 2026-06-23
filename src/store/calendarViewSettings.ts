import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Per-browser calendar view preferences (not synced to the server).
 *
 * `showCompletedTasks` mirrors Motion's "Show completed" toggle: completed
 * auto-scheduled tasks are hidden from the calendar by default so finishing one
 * visibly frees its slot and the remaining tasks compact upward. Flip it on to
 * review what you did — completed tasks then render dimmed at their slots.
 */
interface CalendarViewSettings {
  showCompletedTasks: boolean;
  setShowCompletedTasks: (show: boolean) => void;
  toggleShowCompletedTasks: () => void;
}

export const useCalendarViewSettings = create<CalendarViewSettings>()(
  persist(
    (set) => ({
      showCompletedTasks: false,
      setShowCompletedTasks: (showCompletedTasks) => set({ showCompletedTasks }),
      toggleShowCompletedTasks: () =>
        set((state) => ({ showCompletedTasks: !state.showCompletedTasks })),
    }),
    {
      name: "calendar-view-settings",
    }
  )
);
