import { prisma } from "@/lib/prisma";
import { createGoogleOAuthClient } from "@/lib/google";
import { MICROSOFT_GRAPH_AUTH_ENDPOINTS } from "./outlook";
import { getOutlookCredentials } from "@/lib/auth";
import { newDate } from "./date-utils";

export type Provider = "GOOGLE" | "OUTLOOK";

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

  async getTokens(accountId: string): Promise<TokenInfo | null> {
    const account = await prisma.connectedAccount.findUnique({
      where: { id: accountId },
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

  async refreshGoogleTokens(accountId: string): Promise<TokenInfo | null> {
    const account = await prisma.connectedAccount.findUnique({
      where: { id: accountId },
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
      const expiresAt = newDate(
        Date.now() + (response.credentials.expiry_date || 3600 * 1000)
      );

      // Update tokens in database
      const updatedAccount = await prisma.connectedAccount.update({
        where: { id: accountId },
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
    }
  ): Promise<string> {
    const account = await prisma.connectedAccount.upsert({
      where: {
        provider_email: {
          provider,
          email,
        },
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      },
      create: {
        provider,
        email,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      },
    });

    return account.id;
  }

  async removeAccount(accountId: string): Promise<void> {
    // First delete all calendar feeds associated with this account
    await prisma.calendarFeed.deleteMany({
      where: { accountId },
    });

    // Then delete the account
    await prisma.connectedAccount.delete({
      where: { id: accountId },
    });
  }

  async listAccounts(): Promise<
    Array<{
      id: string;
      provider: Provider;
      email: string;
      calendars: Array<{ id: string; name: string }>;
    }>
  > {
    const accounts = await prisma.connectedAccount.findMany({
      include: {
        calendars: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return accounts.map((account) => ({
      id: account.id,
      provider: account.provider as Provider,
      email: account.email,
      calendars: account.calendars,
    }));
  }

  async refreshOutlookTokens(accountId: string): Promise<TokenInfo | null> {
    const account = await prisma.connectedAccount.findUnique({
      where: { id: accountId },
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
        where: { id: accountId },
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
}
