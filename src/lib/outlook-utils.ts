import { Client } from "@microsoft/microsoft-graph-client";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { Provider, TokenManager } from "@/lib/token-manager";

const LOG_SOURCE = "OutlookUtils";

/**
 * Get a Microsoft Graph client for a specific account or user ID
 * This function handles token refreshing and authentication
 *
 * @param accountIdOrUserId The account ID or user ID to get the client for
 * @returns A configured Microsoft Graph client
 */
export async function getMsGraphClient(accountIdOrUserId: string) {
  const tokenManager = TokenManager.getInstance();
  let tokens;
  let userId: string;
  let accountId: string;

  try {
    // First try to find the account
    const account = await prisma.connectedAccount.findUnique({
      where: { id: accountIdOrUserId },
    });

    if (account) {
      // It's an account ID
      accountId = accountIdOrUserId;

      if (!account.userId) {
        throw new Error("Account has no user ID");
      }

      userId = account.userId;
      tokens = await tokenManager.getTokens(accountId, userId);
    } else {
      // It's a user ID
      userId = accountIdOrUserId;

      // Find the first Outlook account for this user
      const account = await prisma.connectedAccount.findFirst({
        where: {
          userId: accountIdOrUserId,
          provider: "OUTLOOK" as Provider,
        },
      });

      if (!account) {
        throw new Error("No Outlook account found for user");
      }

      accountId = account.id;
      tokens = await tokenManager.getTokens(accountId, userId);
    }

    if (!tokens) {
      throw new Error("No tokens found for account");
    }

    // Check if token needs refresh
    if (tokens.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
      // Refresh the token
      const refreshed = await tokenManager.refreshOutlookTokens(
        accountId,
        userId
      );
      if (!refreshed) {
        throw new Error("Failed to refresh tokens");
      }
      tokens = refreshed;
    }

    // Return initialized client
    return Client.init({
      authProvider: async (done) => {
        done(null, tokens!.accessToken);
      },
      defaultVersion: "v1.0",
    });
  } catch (error) {
    logger.error(
      "Failed to get Microsoft Graph client",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        accountIdOrUserId,
      },
      LOG_SOURCE
    );
    throw error;
  }
}
