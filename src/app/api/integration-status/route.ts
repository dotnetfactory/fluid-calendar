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

    const settings = await prisma.systemSettings.findFirst();

    const has = (dbVal?: string | null, envVal?: string) =>
      !!(dbVal || envVal);

    return NextResponse.json({
      google: {
        configured:
          has(settings?.googleClientId, process.env.GOOGLE_CLIENT_ID) &&
          has(settings?.googleClientSecret, process.env.GOOGLE_CLIENT_SECRET),
      },
      outlook: {
        configured:
          has(settings?.outlookClientId, process.env.AZURE_AD_CLIENT_ID) &&
          has(settings?.outlookClientSecret, process.env.AZURE_AD_CLIENT_SECRET) &&
          has(settings?.outlookTenantId, process.env.AZURE_AD_TENANT_ID),
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
