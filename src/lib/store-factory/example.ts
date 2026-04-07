/**
 * Example counter store using the enhanced store factory
 *
 * This demonstrates improved TypeScript support with proper type separation
 */
import { createStandardStore } from "./factory";

// Separate state and actions for better TypeScript support
interface CounterState {
  count: number;
}

interface CounterActions {
  increment: () => void;
  decrement: () => void;
  addAmount: (amount: number) => void;
  reset: () => void;
}

// Create the store using our enhanced factory
export const useExampleCounterStore = createStandardStore({
  name: "example-counter",
  initialState: { count: 0 } satisfies CounterState,
  persist: false,
  storeCreator: (set) =>
    ({
      increment: () => set((state) => ({ count: state.count + 1 })),
      decrement: () => set((state) => ({ count: state.count - 1 })),
      addAmount: (amount) => set((state) => ({ count: state.count + amount })),
      reset: () => set({ count: 0 }),
    }) satisfies CounterActions,
});

// Example with persistence enabled
export const usePersistentCounterStore = createStandardStore({
  name: "persistent-counter",
  initialState: { count: 0 } satisfies CounterState,
  persist: true,
  persistOptions: {
    version: 1,
  },
  storeCreator: (set) =>
    ({
      increment: () => set((state) => ({ count: state.count + 1 })),
      decrement: () => set((state) => ({ count: state.count - 1 })),
      addAmount: (amount) => set((state) => ({ count: state.count + amount })),
      reset: () => set({ count: 0 }),
    }) satisfies CounterActions,
});

// The stores will automatically have a clear() method that resets to initial state
// Usage: useExampleCounterStore.getState().clear()
