import { z } from "zod";

/**
 * Output schema for integration status
 */
export const IntegrationStatusOutputSchema = z.object({
  google: z.object({
    configured: z.boolean(),
  }),
  outlook: z.object({
    configured: z.boolean(),
  }),
});

// Export types
export type IntegrationStatusOutput = z.infer<
  typeof IntegrationStatusOutputSchema
>;
