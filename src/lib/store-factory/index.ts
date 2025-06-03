/**
 * Enhanced Zustand Store Factory
 *
 * A factory for creating standardized Zustand stores with enforced methods
 * and enhanced TypeScript support
 */

// Core factory function and types
export { createStandardStore, type StandardStoreMethods } from "./factory";

// Enhanced types for improved TypeScript support
export type {
  StoreFactoryOptions,
  StandardStore,
  ExtractState,
  HasClearMethod,
  StoreSelector,
} from "./types";

// Example implementations for reference
export { useExampleCounterStore, usePersistentCounterStore } from "./example";
