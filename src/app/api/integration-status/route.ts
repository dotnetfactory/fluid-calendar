import { NextRequest, NextResponse } from "next/server";

import { getGoogleCredentials, getOutlookCredentials } from "@/lib/auth";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "IntegrationStatusAPI";

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request (any logged in user can access this)
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    // Resolve credentials the same way the OAuth routes do: from system
    // settings OR the documented env-var fallback (GOOGLE_*/AZURE_AD_*). This
    // keeps the "configured" status in sync with whether the connect flow can
    // actually run (issue #97). Tenant ID is intentionally not required for
    // Outlook - it is optional and defaults to the "common" tenant.
    const [google, outlook] = await Promise.all([
      getGoogleCredentials(),
      getOutlookCredentials(),
    ]);

    // Only return boolean status of whether integrations are configured
    return NextResponse.json({
      google: {
        configured: !!(google.clientId && google.clientSecret),
      },
      outlook: {
        configured: !!(outlook.clientId && outlook.clientSecret),
      },
    });
  } catch (error) {
    logger.error(
      "Failed to fetch integration status",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch integration status" },
      { status: 500 }
    );
  }
}
