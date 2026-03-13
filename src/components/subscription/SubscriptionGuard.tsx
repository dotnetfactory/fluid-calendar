/**
 * Open-source stub for SubscriptionGuard.
 * Simply renders children without any subscription checks.
 * When SaaS submodule is present, this is replaced via symlink.
 */

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  return <>{children}</>;
}
