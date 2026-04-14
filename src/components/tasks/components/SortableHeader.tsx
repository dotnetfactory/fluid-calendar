import { useCallback, useRef } from "react";

import { HiChevronDown, HiChevronUp } from "react-icons/hi";

import { cn } from "@/lib/utils";

type SortableColumn =
  | "title"
  | "dueDate"
  | "startDate"
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
  const thRef = useRef<HTMLTableCellElement>(null);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const th = thRef.current;
      if (!th) return;

      const startX = e.clientX;
      const startWidth = th.offsetWidth;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const newWidth = Math.max(40, startWidth + moveEvent.clientX - startX);
        th.style.width = `${newWidth}px`;
        th.style.minWidth = `${newWidth}px`;
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    []
  );

  return (
    <th
      ref={thRef}
      scope="col"
      className={cn(
        "group relative cursor-pointer px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground",
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
      {/* Resize handle */}
      <div
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
        onMouseDown={handleResizeStart}
        onClick={(e) => e.stopPropagation()}
      />
    </th>
  );
}
