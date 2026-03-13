/* eslint-disable @typescript-eslint/no-unused-vars */
export interface CalendarProviderPermissionResult {
  canAdd: boolean;
  reason?: string;
  currentUsage: number;
  limit: number | null;
  upgradeRequired?: boolean;
}

export async function checkCalendarProviderPermission(
  userId: string
): Promise<CalendarProviderPermissionResult> {
  return {
    canAdd: true,
    currentUsage: 0,
    limit: null,
  };
}

export async function incrementCalendarProviderUsage(
  userId: string
): Promise<void> {
  // No-op in open-source mode
}

export async function decrementCalendarProviderUsage(
  userId: string
): Promise<void> {
  // No-op in open-source mode
}

export async function syncCalendarProviderUsage(
  userId: string
): Promise<void> {
  // No-op in open-source mode
}
