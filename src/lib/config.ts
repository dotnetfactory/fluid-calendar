/**
 * Configuration system for feature flags
 * This allows toggling between open source and SAAS features
 */

// Environment-based configuration
// Use NEXT_PUBLIC_ prefix to make it available on the client side
export const isSaasEnabled =
  process.env.NEXT_PUBLIC_ENABLE_SAAS_FEATURES === "true";

// Feature flags for specific SAAS features
export const featureFlags = {
  // Core features (always enabled)
  core: {
    basicCalendar: true,
    basicTasks: true,
    googleCalendarSync: true,
    outlookCalendarSync: true,
    caldavSync: true,
  },

  // SAAS-only features (enabled only when SAAS mode is active)
  saas: {
    billing: isSaasEnabled,
    advancedAnalytics: isSaasEnabled,
    aiScheduling: isSaasEnabled,
    prioritySupport: isSaasEnabled,
  },
};

/**
 * Check if a specific feature is enabled
 * @param feature The feature to check
 * @returns Whether the feature is enabled
 */
export function isFeatureEnabled(feature: string): boolean {
  // Check core features
  if (feature in featureFlags.core) {
    return featureFlags.core[feature as keyof typeof featureFlags.core];
  }

  // Check SAAS features
  if (feature in featureFlags.saas) {
    return featureFlags.saas[feature as keyof typeof featureFlags.saas];
  }

  // Feature not found
  return false;
}
