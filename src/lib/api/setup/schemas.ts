import { z } from "zod";

/**
 * Input schema for initial setup
 */
export const SetupInputSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  email: z.string().email("Invalid email address").trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Export types
export type SetupInput = z.infer<typeof SetupInputSchema>;
