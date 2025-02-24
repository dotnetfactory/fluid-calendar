import { useState } from "react";
import { LogMetadata } from "@/lib/logger/types";

interface LogMetadataViewProps {
  metadata: LogMetadata | null;
}

export function LogMetadataView({ metadata }: LogMetadataViewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!metadata || Object.keys(metadata).length === 0) {
    return <span className="text-gray-500">-</span>;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(metadata, null, 2));
  };

  const truncatedView = () => {
    const str = JSON.stringify(metadata);
    return str.length > 50 ? str.slice(0, 50) + "..." : str;
  };

  return (
    <div className="relative">
      {!isExpanded ? (
        <div
          className="cursor-pointer text-sm text-gray-600 hover:text-gray-900"
          onClick={() => setIsExpanded(true)}
        >
          {truncatedView()}
        </div>
      ) : (
        <div className="relative bg-gray-50 p-3 rounded-md shadow-sm">
          <div className="absolute right-2 top-2 space-x-2">
            <button
              onClick={handleCopy}
              className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
              title="Copy to clipboard"
            >
              Copy
            </button>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
            >
              Collapse
            </button>
          </div>
          <pre className="text-sm text-gray-800 whitespace-pre-wrap pt-8">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
