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
      [field]: value,
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label
            htmlFor="level"
            className="block text-sm font-medium text-gray-700"
          >
            Log Level
          </label>
          <select
            id="level"
            value={filters.level}
            onChange={(e) =>
              handleChange("level", e.target.value as LogLevel | "")
            }
            disabled={disabled}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md disabled:bg-gray-100"
          >
            <option value="">All Levels</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="source"
            className="block text-sm font-medium text-gray-700"
          >
            Source
          </label>
          <select
            id="source"
            value={filters.source}
            onChange={(e) => handleChange("source", e.target.value)}
            disabled={disabled}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md disabled:bg-gray-100"
          >
            <option value="">All Sources</option>
            {sources.sort().map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="from"
            className="block text-sm font-medium text-gray-700"
          >
            From Date
          </label>
          <input
            type="datetime-local"
            id="from"
            value={filters.from}
            onChange={(e) => handleChange("from", e.target.value)}
            disabled={disabled}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
          />
        </div>

        <div>
          <label
            htmlFor="to"
            className="block text-sm font-medium text-gray-700"
          >
            To Date
          </label>
          <input
            type="datetime-local"
            id="to"
            value={filters.to}
            onChange={(e) => handleChange("to", e.target.value)}
            disabled={disabled}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="search"
          className="block text-sm font-medium text-gray-700"
        >
          Search
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <input
            type="text"
            id="search"
            value={filters.search}
            onChange={(e) => handleChange("search", e.target.value)}
            disabled={disabled}
            placeholder="Search in messages and sources..."
            className="block w-full pr-10 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
