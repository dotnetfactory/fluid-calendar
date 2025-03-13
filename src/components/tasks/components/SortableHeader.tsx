import { HiChevronDown, HiChevronUp } from "react-icons/hi";
import { cn } from "@/lib/utils";

type SortableColumn =
  | "title"
  | "dueDate"
  | "status"
  | "project"
  | "schedule"
  | "priority"
  | "energyLevel"
  | "preferredTime"
  | "duration";

interface SortableHeaderProps {
  column: SortableColumn;
  label: string;
  currentSort: string;
  direction: "asc" | "desc";
  onSort: (column: SortableColumn) => void;
  className?: string;
}

export function SortableHeader({
  column,
  label,
  currentSort,
  direction,
  onSort,
  className = "",
}: SortableHeaderProps) {
  return (
    <th
      scope="col"
      className={cn(
        "px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer group",
        className
      )}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className="text-muted-foreground/50">
          {currentSort === column ? (
            direction === "asc" ? (
              <HiChevronUp className="h-4 w-4" />
            ) : (
              <HiChevronDown className="h-4 w-4" />
            )
          ) : (
            <HiChevronDown className="h-4 w-4 opacity-0 group-hover:opacity-50" />
          )}
        </span>
      </div>
    </th>
  );
}
