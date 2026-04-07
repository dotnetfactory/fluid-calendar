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

export function useLifetimeSubscription() {
  return {
    hasLifetimeAccess: false,
    loading: false,
    error: null,
  };
}
