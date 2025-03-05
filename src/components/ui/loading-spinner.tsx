import { cn } from "@/lib/utils";

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "default" | "sm" | "lg";
}

export function LoadingSpinner({
  className,
  size = "default",
  ...props
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-current border-t-transparent",
        size === "sm" && "h-4 w-4",
        size === "default" && "h-8 w-8",
        size === "lg" && "h-12 w-12",
        "text-muted-foreground",
        className
      )}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
