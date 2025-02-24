import { useState, useEffect } from "react";
import { LogTable } from "./LogTable";
import { LogFilters } from "./LogFilters";
import { LogSettings } from "./LogSettings";
import { Log } from "@/types/logging";
import { logger } from "@/lib/logger";
import { useLogViewStore } from "@/store/logview";

const LOG_SOURCE = "LogViewer";

export function LogViewer() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalLogs, setTotalLogs] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const { filters, pagination, setFilters, setPagination, addSource } =
    useLogViewStore();

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pagination.current.toString(),
        limit: pagination.limit.toString(),
        ...(filters.level && { level: filters.level }),
        ...(filters.source && { source: filters.source }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await fetch(`/api/logs?${params}`);
      if (!response.ok) throw new Error("Failed to fetch logs");

      const data = await response.json();
      setLogs(data.logs);
      setTotalLogs(data.pagination.total);
      setTotalPages(data.pagination.pages);
      setPagination({
        current: data.pagination.current,
        limit: data.pagination.limit,
      });

      // Add any new sources to the store
      data.logs.forEach((log: Log) => {
        if (log.source) {
          addSource(log.source);
        }
      });

      logger.debug(
        "Logs fetched successfully",
        {
          filterData: JSON.stringify(filters),
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
          filterData: JSON.stringify(filters),
          paginationData: JSON.stringify(pagination),
        },
        LOG_SOURCE
      );
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    logger.debug(
      "Log filters changed",
      {
        oldFilters: JSON.stringify(filters),
        newFilters: JSON.stringify(newFilters),
      },
      LOG_SOURCE
    );
    setFilters(newFilters);
  };

  const handlePageChange = (page: number) => {
    logger.debug(
      "Log page changed",
      {
        oldPage: String(pagination.current),
        newPage: String(page),
      },
      LOG_SOURCE
    );
    setPagination({ current: page });
  };

  const handleCleanup = async () => {
    try {
      setLoading(true);
      logger.info("Starting log cleanup", undefined, LOG_SOURCE);
      const response = await fetch("/api/logs/cleanup", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to cleanup logs");

      const data = await response.json();
      logger.info(
        "Log cleanup completed",
        {
          deletedCount: String(data.count),
          timestamp: new Date().toISOString(),
        },
        LOG_SOURCE
      );

      // Refresh logs after cleanup
      await fetchLogs();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to cleanup logs";
      logger.error(
        "Failed to cleanup logs",
        {
          error: errorMessage,
        },
        LOG_SOURCE
      );
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch logs when filters or pagination changes
  useEffect(() => {
    fetchLogs();
  }, [filters, pagination.current, pagination.limit]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">System Logs</h2>
        <button
          onClick={handleCleanup}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          disabled={loading}
        >
          Cleanup Expired Logs
        </button>
      </div>

      <LogSettings />

      <LogFilters
        filters={filters}
        onChange={handleFilterChange}
        disabled={loading}
      />

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      <LogTable
        logs={logs}
        loading={loading}
        pagination={{
          ...pagination,
          total: totalLogs,
          pages: totalPages,
        }}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
