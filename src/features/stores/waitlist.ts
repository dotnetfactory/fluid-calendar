import { create } from "zustand";

export interface WaitlistEntry {
  id: string;
  email: string;
  status: string;
  createdAt: Date;
}

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

  fetchEntries: async () => {
    return Promise.resolve();
  },

  clear: () => {
    set({ entries: [], error: null });
  },
}));
