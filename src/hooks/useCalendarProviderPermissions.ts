import { useQuery, useQueryClient } from "@tanstack/react-query";

import { CalendarProviderPermissionResult } from "@saas/services/calendar-provider-permissions";

/**
 * Hook to check calendar provider permissions for the current user
 */
export function useCalendarProviderPermissions() {
  return useQuery({
    queryKey: ["calendar-provider-permissions"],
    queryFn: async (): Promise<CalendarProviderPermissionResult> => {
      const response = await fetch("/api/calendar-providers/permissions");

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication required");
        }
        throw new Error("Failed to check calendar provider permissions");
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error.message === "Authentication required") {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook to invalidate calendar provider permissions cache
 */
export function useInvalidateCalendarProviderPermissions() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({
      queryKey: ["calendar-provider-permissions"],
    });
  };
}

/**
 * Hook to get permission check result with loading states
 */
export function useCanAddCalendarProvider() {
  const { data, isLoading, error } = useCalendarProviderPermissions();

  return {
    canAdd: data?.canAdd ?? false,
    reason: data?.reason,
    currentUsage: data?.currentUsage ?? 0,
    limit: data?.limit,
    upgradeRequired: data?.upgradeRequired ?? false,
    isLoading,
    error,
    // Helper computed values
    isAtLimit:
      data?.limit !== null &&
      data?.limit !== undefined &&
      (data?.currentUsage ?? 0) >= data.limit,
    hasUnlimited: data?.limit === null,
    remainingSlots:
      data?.limit !== null && data?.limit !== undefined
        ? Math.max(0, data.limit - (data?.currentUsage ?? 0))
        : null,
  };
}
