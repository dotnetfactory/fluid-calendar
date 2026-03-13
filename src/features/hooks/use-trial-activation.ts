export function useTrialActivation() {
  return {
    activateTrial: async (): Promise<boolean> => false,
    isLoading: false,
    error: null,
    clearError: () => {},
  };
}
