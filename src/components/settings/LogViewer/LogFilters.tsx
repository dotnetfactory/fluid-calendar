import { Search } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useLogViewStore } from "@/store/logview";

import { LogLevel } from "@/types/logging";

interface LogFiltersProps {
  filters: {
    level: LogLevel | "";
    source: string;
    from: string;
    to: string;
    search: string;
  };
  onChange: (filters: LogFiltersProps["filters"]) => void;
  disabled?: boolean;
}

export function LogFilters({ filters, onChange, disabled }: LogFiltersProps) {
  const { sources } = useLogViewStore();

  const handleChange = (field: keyof typeof filters, value: string) => {
    onChange({
      ...filters,
      [field]:
        field === "level" || field === "source"
          ? value === "all"
            ? ""
            : value
          : value,
    });
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="level">Log Level</Label>
            <Select
              value={filters.level || "all"}
              onValueChange={(value) => handleChange("level", value)}
              disabled={disabled}
            >
              <SelectTrigger id="level">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Select
              value={filters.source || "all"}
              onValueChange={(value) => handleChange("source", value)}
              disabled={disabled}
            >
              <SelectTrigger id="source">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {sources.sort().map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="from">From Date</Label>
            <Input
              type="datetime-local"
              id="from"
              value={filters.from}
              onChange={(e) => handleChange("from", e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="to">To Date</Label>
            <Input
              type="datetime-local"
              id="to"
              value={filters.to}
              onChange={(e) => handleChange("to", e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Input
              id="search"
              value={filters.search}
              onChange={(e) => handleChange("search", e.target.value)}
              disabled={disabled}
              placeholder="Search in messages and sources..."
              className="pl-3 pr-10"
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
