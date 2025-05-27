import { TRPCError } from "@trpc/server";

import { deleteAccount, getAllAccounts } from "@/lib/api/accounts";

import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { DeleteAccountInputSchema } from "./schemas";

/**
 * Accounts tRPC router
 * Handles connected account operations with proper authentication and validation
 */
export const accountsRouter = createTRPCRouter({
  /**
   * Get all connected accounts for the authenticated user
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getAllAccounts(ctx.userId);
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch connected accounts",
        cause: error,
      });
    }
  }),

  /**
   * Delete a connected account and its associated calendar feeds
   */
  delete: protectedProcedure
    .input(DeleteAccountInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteAccount(ctx.userId, input);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("Account not found")
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "Account not found or you don't have permission to delete it",
            cause: error,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete connected account",
          cause: error,
        });
      }
    }),
});
