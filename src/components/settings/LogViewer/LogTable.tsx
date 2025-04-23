import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Log } from "@/types/logging";

import { LogMetadataView } from "./LogMetadata";

interface Pagination {
  total: number;
  pages: number;
  current: number;
  limit: number;
}

interface LogTableProps {
  logs: Log[];
  loading: boolean;
  pagination: Pagination;
  onPageChange: (page: number) => void;
}

export function LogTable({
  logs,
  loading,
  pagination,
  onPageChange,
}: LogTableProps) {
  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "error":
        return "text-destructive font-medium";
      case "warn":
        return "text-yellow-600 dark:text-yellow-500 font-medium";
      case "info":
        return "text-blue-600 dark:text-blue-400 font-medium";
      case "debug":
        return "text-muted-foreground font-medium";
      default:
        return "text-foreground font-medium";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Metadata</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-muted-foreground">
                  {formatDate(log.timestamp)}
                </TableCell>
                <TableCell>
                  <span className={getLevelColor(log.level)}>{log.level}</span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {log.source || "-"}
                </TableCell>
                <TableCell>{log.message}</TableCell>
                <TableCell>
                  <LogMetadataView metadata={log.metadata} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-medium">
            {(pagination.current - 1) * pagination.limit + 1}
          </span>{" "}
          to{" "}
          <span className="font-medium">
            {Math.min(pagination.current * pagination.limit, pagination.total)}
          </span>{" "}
          of <span className="font-medium">{pagination.total}</span> results
        </div>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.current - 1)}
            disabled={pagination.current === 1}
          >
            Previous
          </Button>
          {Array.from({ length: pagination.pages }, (_, i) => i + 1)
            .filter(
              (page) =>
                page === 1 ||
                page === pagination.pages ||
                Math.abs(page - pagination.current) <= 2
            )
            .map((page, i, array) => {
              if (i > 0 && array[i - 1] !== page - 1) {
                return (
                  <Button
                    key={`ellipsis-${page}`}
                    variant="outline"
                    size="sm"
                    disabled
                  >
                    ...
                  </Button>
                );
              }
              return (
                <Button
                  key={page}
                  variant={page === pagination.current ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page)}
                >
                  {page}
                </Button>
              );
            })}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.current + 1)}
            disabled={pagination.current === pagination.pages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
