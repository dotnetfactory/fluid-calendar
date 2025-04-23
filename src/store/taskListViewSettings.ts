import { create } from "zustand";
import { persist } from "zustand/middleware";

import { EnergyLevel, TaskStatus, TimePreference } from "@/types/task";

interface TaskListViewSettings {
  // Sort settings
  sortBy:
    | "dueDate"
    | "startDate"
    | "title"
    | "status"
    | "project"
    | "schedule"
    | "priority"
    | "energyLevel"
    | "preferredTime"
    | "duration";
  sortDirection: "asc" | "desc";

  // Filter settings
  status?: TaskStatus[];
  energyLevel?: EnergyLevel[];
  timePreference?: TimePreference[];
  tagIds?: string[];
  search?: string;
  hideUpcomingTasks?: boolean;

  // Actions
  setSortBy: (sortBy: TaskListViewSettings["sortBy"]) => void;
  setSortDirection: (direction: TaskListViewSettings["sortDirection"]) => void;
  setFilters: (
    filters: Partial<
      Omit<
        TaskListViewSettings,
        "setSortBy" | "setSortDirection" | "setFilters" | "resetFilters"
      >
    >
  ) => void;
  resetFilters: () => void;
}

const DEFAULT_STATUS_FILTERS = [TaskStatus.TODO, TaskStatus.IN_PROGRESS];

export const useTaskListViewSettings = create<TaskListViewSettings>()(
  persist(
    (set) => ({
      // Initial sort settings
      sortBy: "dueDate",
      sortDirection: "desc",

      // Initial filter settings
      status: DEFAULT_STATUS_FILTERS,
      energyLevel: undefined,
      timePreference: undefined,
      tagIds: undefined,
      search: undefined,
      hideUpcomingTasks: false,

      // Actions
      setSortBy: (sortBy) => set({ sortBy }),
      setSortDirection: (sortDirection) => set({ sortDirection }),
      setFilters: (filters) => set(filters),
      resetFilters: () =>
        set({
          status: DEFAULT_STATUS_FILTERS,
          energyLevel: undefined,
          timePreference: undefined,
          tagIds: undefined,
          search: undefined,
          hideUpcomingTasks: false,
        }),
    }),
    {
      name: "task-list-view-settings",
    }
  )
);
