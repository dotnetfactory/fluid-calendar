"use client";

import { cn } from "@/lib/utils";

import { getAppVersion, getVersionGithubUrl } from "@/lib/version";

interface VersionBadgeProps {
  className?: string;
}

/**
 * Shows the application version as a link to the project's GitHub page.
 * Rendered in the shared layout footer so it appears on every page.
 */
export function VersionBadge({ className }: VersionBadgeProps) {
  const version = getAppVersion();
  const href = getVersionGithubUrl(version);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="View this version on GitHub"
      className={cn(
        "text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline",
        className
      )}
    >
      v{version}
    </a>
  );
}
