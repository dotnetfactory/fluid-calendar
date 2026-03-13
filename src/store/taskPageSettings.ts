import { createStandardStore } from "../lib/store-factory";

// Type definitions
type ViewMode = "list" | "board";

// Separate state and actions for enhanced TypeScript support
interface TaskPageSettingsState {
  viewMode: ViewMode;
}

interface TaskPageSettingsActions {
  setViewMode: (mode: ViewMode) => void;
}

export const useTaskPageSettings = createStandardStore({
  name: "task-page-settings",
  initialState: { viewMode: "list" } as TaskPageSettingsState,
  storeCreator: (set) =>
    ({
      setViewMode: (viewMode: ViewMode) => set({ viewMode }),
    }) satisfies TaskPageSettingsActions,
  persist: true,
  persistOptions: {
    storageKey: "task-page-settings",
  },
});
