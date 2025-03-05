import { useState } from "react";
import { LogMetadata } from "@/lib/logger/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, ChevronUp } from "lucide-react";

interface LogMetadataViewProps {
  metadata: LogMetadata | null;
}

export function LogMetadataView({ metadata }: LogMetadataViewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!metadata || Object.keys(metadata).length === 0) {
    return <span className="text-muted-foreground">-</span>;
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
          className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
          onClick={() => setIsExpanded(true)}
        >
          {truncatedView()}
        </div>
      ) : (
        <Card className="relative">
          <CardContent className="p-3 pt-8">
            <div className="absolute right-2 top-2 flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-7 px-2"
              >
                <Copy className="h-3 w-3" />
                <span className="sr-only">Copy to clipboard</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="h-7 px-2"
              >
                <ChevronUp className="h-3 w-3" />
                <span className="sr-only">Collapse</span>
              </Button>
            </div>
            <pre className="text-sm whitespace-pre-wrap">
              {JSON.stringify(metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
