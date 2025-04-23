import { NextRequest, NextResponse } from "next/server";

import { getOutlookCredentials } from "@/lib/auth";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { MICROSOFT_GRAPH_AUTH_ENDPOINTS } from "@/lib/outlook";
import { OutlookCalendarService } from "@/lib/outlook-calendar";
import { TokenManager } from "@/lib/token-manager";

const LOG_SOURCE = "OutlookCalendarAPI";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      logger.error("Outlook auth error:", { error }, LOG_SOURCE);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?error=outlook-auth-failed`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?error=no-code`
      );
    }

    const { clientId, clientSecret } = await getOutlookCredentials();
    const redirectUrl = `${process.env.NEXTAUTH_URL}/api/calendar/outlook`;

    // Exchange code for tokens
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUrl,
      grant_type: "authorization_code",
    });

    const tokenResponse = await fetch(MICROSOFT_GRAPH_AUTH_ENDPOINTS.token, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!tokenResponse.ok) {
      logger.error(
        "Failed to exchange code for tokens",
        { status: tokenResponse.status },
        LOG_SOURCE
      );
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?error=token-exchange-failed`
      );
    }

    const tokenData = await tokenResponse.json();
    const expiresAt = newDate(Date.now() + tokenData.expires_in * 1000);

    // Create a temporary account to get user info
    const tempAccount = {
      id: "temp",
      provider: "OUTLOOK",
      email: "",
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
      createdAt: newDate(),
      updatedAt: newDate(),
      caldavUrl: null,
      caldavUsername: null,
      userId: userId ?? null,
    };

    // Get user info
    const outlookService = new OutlookCalendarService(tempAccount);
    try {
      const userProfile = await outlookService.getUserProfile();
      if (!userProfile || !userProfile.mail) {
        logger.error(
          "Failed to get user profile",
          { profile: userProfile.id ?? "unknown" },
          LOG_SOURCE
        );
        return NextResponse.redirect(
          `${process.env.NEXTAUTH_URL}/settings?error=profile-fetch-failed`
        );
      }

      // Store tokens
      const tokenManager = TokenManager.getInstance();
      await tokenManager.storeTokens(
        "OUTLOOK",
        userProfile.mail,
        {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt,
        },
        userId ?? "unknown"
      );

      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?success=true`
      );
    } catch (error) {
      logger.error(
        "Failed to get user profile",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?error=profile-failed`
      );
    }
  } catch (error) {
    logger.error(
      "Failed to connect Outlook account",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?error=callback-failed`
    );
  }
}
