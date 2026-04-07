/**
 * Open-source stub for calendar provider permissions.
 * Always allows adding providers (no subscription limits).
 * When SaaS submodule is present, this is replaced via symlink.
 */

export interface CalendarProviderPermissionResult {
  canAdd: boolean;
  reason?: string;
  currentUsage: number;
  limit: number | null;
  upgradeRequired?: boolean;
}

export async function checkCalendarProviderPermission(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string
): Promise<CalendarProviderPermissionResult> {
  return {
    canAdd: true,
    currentUsage: 0,
    limit: null,
  };
}

export async function incrementCalendarProviderUsage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string
): Promise<void> {
  // No-op in open-source mode
}

export async function decrementCalendarProviderUsage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string
): Promise<void> {
  // No-op in open-source mode
}

export async function syncCalendarProviderUsage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string
): Promise<void> {
  // No-op in open-source mode
}
