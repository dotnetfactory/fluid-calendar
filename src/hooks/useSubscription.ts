/**
 * Open-source stub for useSubscription hook.
 * Always returns no active subscription.
 * When SaaS submodule is present, this is replaced via symlink.
 */

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  plan?: string;
  status?: string;
  loading: boolean;
  error?: Error;
}

export function useSubscription(): SubscriptionStatus {
  return {
    hasActiveSubscription: false,
    loading: false,
  };
}
