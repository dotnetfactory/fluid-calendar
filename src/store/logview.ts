import { create } from "zustand";
import { persist } from "zustand/middleware";

import { logger } from "@/lib/logger";
import { LogLevel } from "@/lib/logger/types";

import { Log } from "@/types/logging";

const LOG_SOURCE = "LogViewStore";

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
  logs: Log[];
  totalLogs: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  setFilters: (filters: Partial<LogViewFilters>) => void;
  setPagination: (pagination: Partial<LogViewPagination>) => void;
  addSource: (source: string) => void;
  fetchSources: () => Promise<void>;
  fetchLogs: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
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
    (set, get) => ({
      filters: DEFAULT_FILTERS,
      pagination: DEFAULT_PAGINATION,
      sources: [],
      logs: [],
      totalLogs: 0,
      totalPages: 0,
      loading: false,
      error: null,
      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
          pagination: { ...state.pagination, current: 1 },
        }));
        get().fetchLogs();
      },
      setPagination: (newPagination) => {
        set((state) => ({
          pagination: { ...state.pagination, ...newPagination },
        }));
        get().fetchLogs();
      },
      addSource: (source) =>
        set((state) => ({
          sources: state.sources.includes(source)
            ? state.sources
            : [...state.sources, source],
        })),
      fetchSources: async () => {
        try {
          const response = await fetch("/api/logs/sources");
          if (!response.ok) throw new Error("Failed to fetch log sources");
          const data = await response.json();

          set((state) => ({
            sources: [...new Set([...state.sources, ...data.sources])].sort(),
          }));

          logger.debug(
            "Log sources fetched successfully",
            {
              sourceCount: String(data.sources.length),
            },
            LOG_SOURCE
          );
        } catch (err) {
          logger.error(
            "Failed to fetch log sources",
            {
              error:
                err instanceof Error
                  ? err.message
                  : "Failed to fetch log sources",
            },
            LOG_SOURCE
          );
        }
      },
      fetchLogs: async () => {
        const state = get();
        set({ loading: true, error: null });

        try {
          const params = new URLSearchParams({
            page: state.pagination.current.toString(),
            limit: state.pagination.limit.toString(),
            ...(state.filters.level && { level: state.filters.level }),
            ...(state.filters.source && { source: state.filters.source }),
            ...(state.filters.from && { from: state.filters.from }),
            ...(state.filters.to && { to: state.filters.to }),
            ...(state.filters.search && { search: state.filters.search }),
          });

          const response = await fetch(`/api/logs?${params}`);
          if (!response.ok) throw new Error("Failed to fetch logs");

          const data = await response.json();

          set({
            logs: data.logs,
            totalLogs: data.pagination.total,
            totalPages: data.pagination.pages,
            pagination: {
              ...state.pagination,
              current: data.pagination.current,
              limit: data.pagination.limit,
            },
            loading: false,
          });

          // Add any new sources
          data.logs.forEach((log: Log) => {
            if (log.source) get().addSource(log.source);
          });

          logger.debug(
            "Logs fetched successfully",
            {
              filterData: JSON.stringify(state.filters),
              paginationData: JSON.stringify(data.pagination),
            },
            LOG_SOURCE
          );
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "An error occurred";
          logger.error(
            "Failed to fetch logs",
            {
              error: errorMessage,
              filterData: JSON.stringify(state.filters),
              paginationData: JSON.stringify(state.pagination),
            },
            LOG_SOURCE
          );
          set({ error: errorMessage, loading: false });
        }
      },
      setLoading: (loading: boolean) => set({ loading }),
      setError: (error: string | null) => set({ error }),
      reset: () =>
        set({
          filters: DEFAULT_FILTERS,
          pagination: DEFAULT_PAGINATION,
          sources: [],
          logs: [],
          totalLogs: 0,
          totalPages: 0,
          loading: false,
          error: null,
        }),
    }),
    {
      name: "log-view-store",
    }
  )
);
