import { useEffect } from "react";

import { Trash2 } from "lucide-react";

import AccessDeniedMessage from "@/components/auth/AccessDeniedMessage";
import AdminOnly from "@/components/auth/AdminOnly";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { logger } from "@/lib/logger";

import { useLogViewStore } from "@/store/logview";

import { LogFilters } from "./LogFilters";
import { LogSettings } from "./LogSettings";
import { LogTable } from "./LogTable";

const LOG_SOURCE = "LogViewer";

/**
 * Log viewer component
 * Allows admins to view and filter application logs
 * Only accessible by admin users
 */
export function LogViewer() {
  const {
    logs,
    loading,
    error,
    totalLogs,
    totalPages,
    filters,
    pagination,
    setFilters,
    setPagination,
    fetchSources,
    fetchLogs,
    setLoading,
    setError,
  } = useLogViewStore();

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
      setError(null);
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

  // Fetch sources and initial logs when component mounts
  useEffect(() => {
    fetchSources();
    fetchLogs();
  }, [fetchSources, fetchLogs]);

  return (
    <AdminOnly
      fallback={
        <AccessDeniedMessage message="You do not have permission to access application logs." />
      }
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">System Logs</h2>
          <Button
            variant="destructive"
            onClick={handleCleanup}
            disabled={loading}
            size="sm"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Cleanup Expired Logs
          </Button>
        </div>

        <LogSettings />

        <LogFilters
          filters={filters}
          onChange={handleFilterChange}
          disabled={loading}
        />

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
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
    </AdminOnly>
  );
}
