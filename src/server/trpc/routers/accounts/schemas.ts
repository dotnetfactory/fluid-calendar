import { z } from "zod";

/**
 * Input schema for deleting an account via tRPC
 */
export const DeleteAccountInputSchema = z.object({
  accountId: z.string().uuid("Invalid account ID"),
});

// Export types
export type DeleteAccountInput = z.infer<typeof DeleteAccountInputSchema>;
