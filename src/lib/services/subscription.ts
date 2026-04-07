/**
 * Subscription service stub for open-source version.
 * When the SaaS submodule is present, setup-saas.ts symlinks the real
 * implementation over this file.
 */

import { TrialActivationResponse } from "@/types/subscription";

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  plan?: string;
  status?: string;
}

export const subscriptionService = {
  getSubscriptionStatus: async (): Promise<SubscriptionStatus> => ({
    hasActiveSubscription: false,
  }),

  createCheckout: async (): Promise<{ url?: string; redirectUrl?: string }> => {
    throw new Error("Subscription features require the SaaS version");
  },

  createLifetimeCheckout: async (): Promise<{ url: string }> => {
    throw new Error("Subscription features require the SaaS version");
  },

  getLifetimeStatus: async (): Promise<{ hasLifetimeAccess: boolean }> => ({
    hasLifetimeAccess: false,
  }),

  activateTrial: async (): Promise<TrialActivationResponse> => {
    throw new Error("Subscription features require the SaaS version");
  },
};
