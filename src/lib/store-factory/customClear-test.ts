/**
 * Simple test to verify customClear functionality
 */
import { createStandardStore } from "./factory";

// Test store with custom clear behavior
interface TestState {
  count: number;
  userId: string;
}

interface TestActions {
  increment: () => void;
  setUserId: (id: string) => void;
}

export const useTestStore = createStandardStore({
  name: "test-store",
  initialState: {
    count: 0,
    userId: "",
  } as TestState,
  storeCreator: (set) =>
    ({
      increment: () => set((state) => ({ count: state.count + 1 })),
      setUserId: (userId: string) => set({ userId }),
    }) satisfies TestActions,

  // Custom clear: Only reset count, preserve userId
  customClear: (set, get, initialState) => {
    const currentState = get();
    set({
      ...currentState,
      count: initialState.count, // Reset count to 0
      // Keep userId unchanged
    });
  },
});

// Test store with default clear behavior
export const useDefaultStore = createStandardStore({
  name: "default-store",
  initialState: {
    count: 0,
    userId: "",
  } as TestState,
  storeCreator: (set) =>
    ({
      increment: () => set((state) => ({ count: state.count + 1 })),
      setUserId: (userId: string) => set({ userId }),
    }) satisfies TestActions,
  // No customClear - uses default behavior
});

console.log("✅ CustomClear stores created successfully!");
