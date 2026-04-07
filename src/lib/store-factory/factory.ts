/**
 * Enhanced store factory for creating standardized Zustand stores
 *
 * This version provides better TypeScript support while maintaining compatibility
 * and avoiding complex generic constraints that can cause compilation issues.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Standard methods that all stores must implement
 */
export interface StandardStoreMethods {
  clear: () => void;
}

/**
 * Extended store interface that includes Zustand's getState method
 */
export interface ExtendedStore<TState, TActions> {
  (): TState & TActions & StandardStoreMethods;
  getState: () => TState & TActions & StandardStoreMethods;
}

/**
 * Store configuration options with improved TypeScript support
 */
export interface StoreFactoryOptions<TState, TActions> {
  /** Unique name for the store (used for persistence and debugging) */
  name: string;
  /** Initial state for the store */
  initialState: TState;
  /** State creator function that returns actions with proper typing */
  storeCreator: (
    set: (
      partial:
        | TState
        | Partial<TState>
        | ((state: TState) => TState | Partial<TState>),
      replace?: boolean
    ) => void,
    get: () => TState,
    store?: unknown
  ) => TActions;
  /** Whether to enable persistence */
  persist?: boolean;
  /** Persistence configuration options */
  persistOptions?: {
    storageKey?: string;
    version?: number;
    [key: string]: unknown;
  };
  /**
   * Optional custom clear implementation
   * If provided, this will be used instead of the default clear behavior
   * @param set - Zustand set function to update state
   * @param get - Zustand get function to read current state
   * @param initialState - The initial state for default reset behavior
   */
  customClear?: (
    set: (
      partial:
        | TState
        | Partial<TState>
        | ((state: TState) => TState | Partial<TState>),
      replace?: boolean
    ) => void,
    get: () => TState,
    initialState: TState
  ) => void;
}

/**
 * Creates a standardized Zustand store with enforced clear method
 *
 * @param options Configuration options for the store
 * @returns A Zustand store hook with the state, actions, and clear method
 *
 * @example
 * ```typescript
 * interface CounterState {
 *   count: number;
 * }
 *
 * interface CounterActions {
 *   increment: () => void;
 *   decrement: () => void;
 * }
 *
 * // Basic store with default clear behavior
 * const useCounterStore = createStandardStore({
 *   name: "counter",
 *   initialState: { count: 0 } as CounterState,
 *   storeCreator: (set) => ({
 *     increment: () => set((state) => ({ count: state.count + 1 })),
 *     decrement: () => set((state) => ({ count: state.count - 1 })),
 *   } satisfies CounterActions),
 * });
 *
 * // Store with custom clear behavior
 * const useAdvancedStore = createStandardStore({
 *   name: "advanced",
 *   initialState: { count: 0, message: "hello" },
 *   storeCreator: (set) => ({
 *     updateMessage: (msg: string) => set({ message: msg })
 *   }),
 *   customClear: (set, get, initialState) => {
 *     // Custom clear logic - e.g., only reset count, keep message
 *     const currentState = get();
 *     set({ ...currentState, count: initialState.count });
 *   },
 * });
 * ```
 */
export function createStandardStore<TState, TActions>(
  options: StoreFactoryOptions<TState, TActions>
): ExtendedStore<TState, TActions> {
  const {
    name,
    initialState,
    storeCreator,
    persist: enablePersist,
    persistOptions,
    customClear,
  } = options;

  type StoreType = TState & TActions & StandardStoreMethods;

  // Zustand's set and get types
  type ZustandSetState<S> = (
    partial: S | Partial<S> | ((state: S) => S | Partial<S>),
    replace?: boolean
  ) => void;
  type ZustandGetState<S> = () => S;

  // Create enhanced store creator that adds standard methods
  const enhancedCreator = (
    set: ZustandSetState<StoreType>, // This is the set from Zustand, operating on StoreType
    get: ZustandGetState<StoreType>, // This is the get from Zustand, operating on StoreType
    store: unknown // Zustand's internal store api
  ): StoreType => {
    // Adapter for 'set' to be passed to storeCreator and customClear, expecting TState
    const setAdapterForTState: ZustandSetState<TState> = (update, replace) => {
      if (typeof update === "function") {
        const updater = update as (state: TState) => TState | Partial<TState>;
        set(
          // Call the original Zustand set
          (currentStore: StoreType) => {
            const tStateChanges = updater(currentStore as unknown as TState);
            return tStateChanges as unknown as Partial<StoreType>;
          },
          replace
        );
      } else {
        // update is TState | Partial<TState>.
        // Cast to Partial<StoreType> to satisfy the linter.
        set(update as Partial<StoreType>, replace);
      }
    };

    // Adapter for 'get' to be passed to storeCreator and customClear, expecting TState
    const getAdapterForTState: ZustandGetState<TState> = () => {
      return get() as unknown as TState;
    };

    return {
      ...initialState,
      ...storeCreator(setAdapterForTState, getAdapterForTState, store),
      clear: customClear
        ? () =>
            customClear(setAdapterForTState, getAdapterForTState, initialState)
        : () => set(initialState as Partial<StoreType>, true), // Cast initialState to Partial<StoreType>
    } as StoreType;
  };

  // Apply persistence if requested
  if (enablePersist) {
    const store = create<StoreType>()(
      persist(enhancedCreator, {
        name,
        ...persistOptions,
      })
    );
    return store as ExtendedStore<TState, TActions>;
  }

  // Return store without persistence
  const store = create<StoreType>(enhancedCreator);
  return store as ExtendedStore<TState, TActions>;
}
