"use client";

import { ReactNode } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
  showLoading?: boolean;
}

/**
 * Component that only renders its children if the current user is an admin
 * @param children The content to render if the user is an admin
 * @param fallback Optional content to render if the user is not an admin
 * @param showLoading Whether to show a loading skeleton while checking admin status
 */
export default function AdminOnly({
  children,
  fallback = null,
  showLoading = true,
}: AdminOnlyProps) {
  const { isAdmin, isLoading } = useAdmin();

  if (isLoading && showLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (!isAdmin) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
