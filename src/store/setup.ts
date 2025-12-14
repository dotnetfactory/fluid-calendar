import { createStandardStore } from "../lib/store-factory";

// Enhanced TypeScript interfaces for better type safety
interface SetupState {
  // Whether setup has been checked at least once
  hasChecked: boolean;
  // Whether setup is needed (no users exist)
  needsSetup: boolean | null;
  // Last time the setup status was checked
  lastChecked: number | null;
}

interface SetupActions {
  // Set the setup status
  setSetupStatus: (needsSetup: boolean) => void;
  // Mark that setup has been checked
  markAsChecked: () => void;
  // Reset the setup status (force a new check)
  resetSetupStatus: () => void;
}

// Using our enhanced store factory with persistence
export const useSetupStore = createStandardStore({
  name: "fluid-calendar-setup-storage",
  initialState: {
    hasChecked: false,
    needsSetup: null,
    lastChecked: null,
  } as SetupState,

  storeCreator: (set) =>
    ({
      setSetupStatus: (needsSetup: boolean) =>
        set({
          needsSetup,
          hasChecked: true,
          lastChecked: Date.now(),
        }),
      markAsChecked: () =>
        set({
          hasChecked: true,
          lastChecked: Date.now(),
        }),
      resetSetupStatus: () =>
        set({
          hasChecked: false,
          needsSetup: null,
          lastChecked: null,
        }),
    }) satisfies SetupActions,

  // Enable persistence with same configuration
  persist: true,
  persistOptions: {
    name: "fluid-calendar-setup-storage",
  },
});
