import { NextResponse } from "next/server";

import { getOutlookCredentials } from "@/lib/auth";
import {
  MICROSOFT_GRAPH_AUTH_ENDPOINTS,
  MICROSOFT_GRAPH_SCOPES,
} from "@/lib/outlook";

export async function GET() {
  try {
    const { clientId } = await getOutlookCredentials();
    const redirectUrl = `${process.env.NEXTAUTH_URL}/api/calendar/outlook`;

    // Construct the authorization URL
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUrl,
      scope: MICROSOFT_GRAPH_SCOPES.join(" "),
      response_mode: "query",
      prompt: "consent",
    });

    const authUrl = `${
      MICROSOFT_GRAPH_AUTH_ENDPOINTS.auth
    }?${params.toString()}`;
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Failed to generate Outlook auth URL:", error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?error=outlook-auth-failed`
    );
  }
}
