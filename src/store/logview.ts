import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LogLevel } from "@/lib/logger/types";

interface LogViewFilters {
  level: LogLevel | "";
  source: string;
  from: string;
  to: string;
  search: string;
}

interface LogViewPagination {
  current: number;
  limit: number;
}

interface LogViewState {
  filters: LogViewFilters;
  pagination: LogViewPagination;
  sources: string[];
  setFilters: (filters: Partial<LogViewFilters>) => void;
  setPagination: (pagination: Partial<LogViewPagination>) => void;
  addSource: (source: string) => void;
  reset: () => void;
}

const DEFAULT_FILTERS: LogViewFilters = {
  level: "",
  source: "",
  from: "",
  to: "",
  search: "",
};

const DEFAULT_PAGINATION: LogViewPagination = {
  current: 1,
  limit: 50,
};

export const useLogViewStore = create<LogViewState>()(
  persist(
    (set) => ({
      filters: DEFAULT_FILTERS,
      pagination: DEFAULT_PAGINATION,
      sources: [],
      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
          // Reset to first page when filters change
          pagination: { ...state.pagination, current: 1 },
        })),
      setPagination: (newPagination) =>
        set((state) => ({
          pagination: { ...state.pagination, ...newPagination },
        })),
      addSource: (source) =>
        set((state) => ({
          sources: state.sources.includes(source)
            ? state.sources
            : [...state.sources, source],
        })),
      reset: () =>
        set({
          filters: DEFAULT_FILTERS,
          pagination: DEFAULT_PAGINATION,
          sources: [],
        }),
    }),
    {
      name: "log-view-store",
    }
  )
);
