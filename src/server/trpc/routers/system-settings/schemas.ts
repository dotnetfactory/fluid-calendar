import { z } from "zod";

/**
 * Input schema for updating system settings via tRPC
 */
export const UpdateSystemSettingsInputSchema = z.object({
  logLevel: z.enum(["none", "error", "warn", "info", "debug"]).optional(),
  disableHomepage: z.boolean().optional(),
  publicSignup: z.boolean().optional(),
  queueNotificationsEnabled: z.boolean().optional(),
  dailyEmailEnabled: z.boolean().optional(),
  resendApiKey: z.string().nullable().optional(),
});

/**
 * Input schema for getting homepage disabled status via tRPC
 */
export const GetHomepageDisabledInputSchema = z.object({
  // No input needed - reads from system settings
});

// Export types
export type UpdateSystemSettingsInput = z.infer<
  typeof UpdateSystemSettingsInputSchema
>;
export type GetHomepageDisabledInput = z.infer<
  typeof GetHomepageDisabledInputSchema
>;
