import { createStandardStore } from "../lib/store-factory";

// Local type definitions to avoid import path issues during migration
enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
}

enum EnergyLevel {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

enum TimePreference {
  MORNING = "morning",
  AFTERNOON = "afternoon",
  EVENING = "evening",
}

// Enhanced TypeScript interfaces for better type safety
interface TaskListViewSettingsState {
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
}

interface TaskListViewSettingsActions {
  setSortBy: (sortBy: TaskListViewSettingsState["sortBy"]) => void;
  setSortDirection: (
    direction: TaskListViewSettingsState["sortDirection"]
  ) => void;
  setFilters: (
    filters: Partial<
      Omit<TaskListViewSettingsState, "sortBy" | "sortDirection">
    >
  ) => void;
  resetFilters: () => void;
}

const DEFAULT_STATUS_FILTERS = [TaskStatus.TODO, TaskStatus.IN_PROGRESS];

// Using our enhanced store factory with persistence
export const useTaskListViewSettings = createStandardStore({
  name: "task-list-view-settings",
  initialState: {
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
  } as TaskListViewSettingsState,

  storeCreator: (set) =>
    ({
      setSortBy: (sortBy: TaskListViewSettingsState["sortBy"]) =>
        set({ sortBy }),
      setSortDirection: (
        sortDirection: TaskListViewSettingsState["sortDirection"]
      ) => set({ sortDirection }),
      setFilters: (
        filters: Partial<
          Omit<TaskListViewSettingsState, "sortBy" | "sortDirection">
        >
      ) => set(filters),
      resetFilters: () =>
        set({
          status: DEFAULT_STATUS_FILTERS,
          energyLevel: undefined,
          timePreference: undefined,
          tagIds: undefined,
          search: undefined,
          hideUpcomingTasks: false,
        }),
    }) satisfies TaskListViewSettingsActions,

  // Enable persistence with same configuration
  persist: true,
  persistOptions: {
    name: "task-list-view-settings",
  },
});
