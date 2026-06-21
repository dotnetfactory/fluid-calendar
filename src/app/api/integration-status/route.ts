import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "IntegrationStatusAPI";

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request (any logged in user can access this)
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    // Get system settings
    const settings = await prisma.systemSettings.findFirst();

    // Only return boolean status of whether integrations are configured
    return NextResponse.json({
      google: {
        configured: !!(
          settings?.googleClientId && settings?.googleClientSecret
        ),
      },
      outlook: {
        // Tenant ID is optional: getOutlookCredentials defaults the tenant to
        // "common" and the OAuth endpoints are hardcoded to /common/, so a
        // personal Microsoft account setup uses only client ID + secret. Don't
        // require a tenant ID here or the Connect Outlook button stays disabled
        // for the documented personal-account flow (issue #97).
        configured: !!(
          settings?.outlookClientId && settings?.outlookClientSecret
        ),
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
