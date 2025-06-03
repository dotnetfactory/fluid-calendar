/**
 * Minimal implementation of the waitlist store for the open source version
 * This provides a compatible API with the SaaS version but doesn't implement any functionality
 */
import { create } from "zustand";

// Define a minimal interface for the waitlist store
export interface WaitlistEntry {
  id: string;
  email: string;
  status: string;
  createdAt: Date;
}

// Create a minimal store with empty implementations
export const useWaitlistStore = create<{
  entries: WaitlistEntry[];
  isLoading: boolean;
  error: string | null;
  fetchEntries: () => Promise<void>;
  clear: () => void;
}>((set) => ({
  entries: [],
  isLoading: false,
  error: null,

  // Empty implementation that does nothing
  fetchEntries: async () => {
    // No-op in open source version
    return Promise.resolve();
  },

  // Clear the store (empty implementation)
  clear: () => {
    set({ entries: [], error: null });
  },
}));
