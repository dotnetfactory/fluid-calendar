/**
 * Enhanced types for the Zustand Store Factory
 *
 * This provides a standardized way to create Zustand stores with enforced methods
 * while maintaining enhanced TypeScript safety and compatibility with existing stores.
 */

/**
 * Standard methods that all stores must implement
 * Currently includes only clear(), but can be extended in the future
 */
export interface StandardStoreMethods {
  /**
   * Reset the store to its initial state
   * Use cases: logout, error recovery, testing
   */
  clear: () => void;
}

/**
 * Enhanced store configuration options
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
 * Complete store type that includes state, actions, and standard methods
 */
export type StandardStore<TState, TActions> = TState &
  TActions &
  StandardStoreMethods;

/**
 * Utility type to extract state from a store hook
 */
export type ExtractState<T> = T extends (selector?: infer S) => unknown
  ? S extends (state: infer State) => unknown
    ? State
    : never
  : never;

/**
 * Utility type to check if a store has the clear method
 */
export type HasClearMethod<T> = T extends { clear: () => void } ? true : false;

/**
 * Type-safe store selector helper
 */
export type StoreSelector<TStore, TResult> = (state: TStore) => TResult;
