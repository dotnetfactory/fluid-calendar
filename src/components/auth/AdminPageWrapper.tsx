"use client";

import { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { useAdmin } from "@/hooks/use-admin";

import AdminAccessDenied from "./AdminAccessDenied";

interface AdminPageWrapperProps {
  children: ReactNode;
}

/**
 * Wrapper component for admin-only pages
 * Shows a loading skeleton while checking admin status
 * Shows an access denied message if the user is not an admin
 */
export default function AdminPageWrapper({ children }: AdminPageWrapperProps) {
  const { isAdmin, isLoading } = useAdmin();

  if (isLoading) {
    return (
      <div className="container space-y-4 py-8">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <AdminAccessDenied />;
  }

  return <>{children}</>;
}
