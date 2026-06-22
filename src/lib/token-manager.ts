import { Prisma } from "@prisma/client";

import { getOutlookCredentials } from "@/lib/auth";
import { createGoogleOAuthClient } from "@/lib/google";
import { prisma } from "@/lib/prisma";

import { newDate } from "./date-utils";
import { MICROSOFT_GRAPH_AUTH_ENDPOINTS } from "./outlook";

export type Provider = "GOOGLE" | "OUTLOOK" | "CALDAV";

interface TokenInfo {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

export class TokenManager {
  private static instance: TokenManager;
  private constructor() {}

  public static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  async getTokens(
    accountId: string,
    userId: string
  ): Promise<TokenInfo | null> {
    const account = await prisma.connectedAccount.findUnique({
      where: { id: accountId, userId },
    });

    if (!account) {
      return null;
    }

    return {
      accessToken: account.accessToken,
      refreshToken: account.refreshToken || undefined,
      expiresAt: account.expiresAt,
    };
  }

  async refreshGoogleTokens(
    accountId: string,
    userId: string
  ): Promise<TokenInfo | null> {
    const account = await prisma.connectedAccount.findUnique({
      where: { id: accountId, userId },
    });

    if (!account || !account.refreshToken) {
      return null;
    }

    const oauth2Client = await createGoogleOAuthClient({
      redirectUrl: `${process.env.NEXTAUTH_URL}/api/auth/callback/google`,
    });

    oauth2Client.setCredentials({
      refresh_token: account.refreshToken,
    });

    try {
      const response = await oauth2Client.refreshAccessToken();
      // expiry_date is an absolute epoch-ms timestamp, not a duration.
      const expiresAt = newDate(
        response.credentials.expiry_date || Date.now() + 3600 * 1000
      );

      // Update tokens in database
      const updatedAccount = await prisma.connectedAccount.update({
        where: { id: accountId, userId },
        data: {
          accessToken: response.credentials.access_token!,
          refreshToken:
            response.credentials.refresh_token || account.refreshToken,
          expiresAt,
        },
      });

      return {
        accessToken: updatedAccount.accessToken,
        refreshToken: updatedAccount.refreshToken || undefined,
        expiresAt: updatedAccount.expiresAt,
      };
    } catch (error) {
      console.error("Failed to refresh Google tokens:", error);
      return null;
    }
  }

  async storeTokens(
    provider: Provider,
    email: string,
    tokens: {
      accessToken: string;
      refreshToken?: string;
      expiresAt: Date;
    },
    userId: string
  ): Promise<string> {
    // Upsert one OAuth account per (userId, provider, email). We can't use a
    // named composite unique input here because the ConnectedAccount uniqueness
    // key now includes caldavUrl (NULLS NOT DISTINCT) so multiple CalDAV servers
    // can be connected; OAuth rows (caldavUrl is null) still collide on
    // (userId, provider, email). To keep this path idempotent under concurrent
    // first-time callbacks (two OAuth callbacks racing to create the same
    // account), we update an existing row if found, otherwise create - and if
    // the create loses the race and hits the unique constraint (P2002), we fall
    // back to updating the row the winner just inserted.
    const data = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    };

    const existing = await prisma.connectedAccount.findFirst({
      where: { userId, provider, email },
    });

    if (existing) {
      const updated = await prisma.connectedAccount.update({
        where: { id: existing.id },
        data,
      });
      return updated.id;
    }

    try {
      const created = await prisma.connectedAccount.create({
        data: { provider, email, userId, ...data },
      });
      return created.id;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        // A concurrent callback created the row first; update it instead.
        const raced = await prisma.connectedAccount.findFirst({
          where: { userId, provider, email },
        });
        if (raced) {
          const updated = await prisma.connectedAccount.update({
            where: { id: raced.id },
            data,
          });
          return updated.id;
        }
      }
      throw error;
    }
  }

  async refreshOutlookTokens(
    accountId: string,
    userId: string
  ): Promise<TokenInfo | null> {
    const account = await prisma.connectedAccount.findUnique({
      where: { id: accountId, userId },
    });

    if (!account || !account.refreshToken) {
      return null;
    }

    // Get credentials using the helper function
    const { clientId, clientSecret } = await getOutlookCredentials();

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: account.refreshToken,
      grant_type: "refresh_token",
    });

    try {
      const response = await fetch(MICROSOFT_GRAPH_AUTH_ENDPOINTS.token, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();
      const expiresAt = newDate(Date.now() + data.expires_in * 1000);

      // Update tokens in database
      const updatedAccount = await prisma.connectedAccount.update({
        where: { id: accountId, userId },
        data: {
          accessToken: data.access_token,
          refreshToken: data.refresh_token || account.refreshToken,
          expiresAt,
        },
      });

      return {
        accessToken: updatedAccount.accessToken,
        refreshToken: updatedAccount.refreshToken || undefined,
        expiresAt: updatedAccount.expiresAt,
      };
    } catch (error) {
      console.error("Failed to refresh Outlook tokens:", error);
      return null;
    }
  }

  // For CalDAV, we don't need to refresh tokens as we store the password directly
  // This method is provided for consistency with other providers
  async refreshCalDAVTokens(
    accountId: string,
    userId: string
  ): Promise<TokenInfo | null> {
    const account = await prisma.connectedAccount.findUnique({
      where: { id: accountId, userId },
    });

    if (!account) {
      return null;
    }

    // For CalDAV, we just return the existing tokens
    return {
      accessToken: account.accessToken,
      expiresAt: account.expiresAt,
    };
  }
}
