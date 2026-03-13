export interface TrialActivationResponse {
  success: boolean;
  message: string;
  subscription?: {
    id: string;
    plan: string;
    status: string;
    trialStart: string;
    trialEnd: string;
    calendarProviderLimit: number | null;
  };
}

export interface TrialActivationError {
  error: string;
}

export interface SubscriptionPlan {
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  calendarProviders: number | null;
  features: string[];
}

export interface TrialFeature {
  name: string;
  description?: string;
  included: boolean;
}
