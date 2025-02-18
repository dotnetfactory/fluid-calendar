import { NextRequest, NextResponse } from "next/server";
import { getOutlookCredentials } from "@/lib/auth";
import { MICROSOFT_GRAPH_AUTH_ENDPOINTS } from "@/lib/outlook";
import { TokenManager } from "@/lib/token-manager";
import { OutlookCalendarService } from "@/lib/outlook-calendar";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      console.error("Outlook auth error:", error);
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
      console.error(
        "Failed to exchange code for tokens:",
        await tokenResponse.text()
      );
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?error=token-exchange-failed`
      );
    }

    const tokens = await tokenResponse.json();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Create a temporary account to get user info
    const tempAccount = {
      id: "temp",
      provider: "OUTLOOK",
      email: "",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Get user info
    const outlookService = new OutlookCalendarService(prisma, tempAccount);
    try {
      const userProfile = await outlookService.getUserProfile();

      // Store the tokens
      const tokenManager = TokenManager.getInstance();
      await tokenManager.storeTokens("OUTLOOK", userProfile.mail, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
      });

      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?success=true`
      );
    } catch (error: any) {
      console.error("Failed to get user profile:", {
        error: error.message,
        details: error.body || error,
        stack: error.stack,
      });
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?error=profile-failed`
      );
    }
  } catch (error: any) {
    console.error("Failed to handle Outlook callback:", {
      error: error.message,
      details: error.body || error,
      stack: error.stack,
    });
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?error=callback-failed`
    );
  }
}
