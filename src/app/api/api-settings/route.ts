import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "ApiSettingsRoute";

/**
 * GET /api/api-settings — Get the user's API settings (the enable gate).
 *
 * Returns { enabled: boolean }.
 * If no row exists, treats as false (optionally upserts a default).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Upsert default false, matching the auto-schedule-settings pattern
    const settings = await prisma.apiSettings.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        enabled: false,
      },
      select: {
        enabled: true,
      },
    });

    return NextResponse.json({
      enabled: settings.enabled,
    });
  } catch (error) {
    logger.error(
      "Failed to fetch API settings",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch API settings" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/api-settings — Update the user's API settings.
 *
 * Body: { enabled: boolean }
 * Upserts with the userId as the key.
 * Returns { enabled }.
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;
    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled must be a boolean" },
        { status: 400 }
      );
    }

    const settings = await prisma.apiSettings.upsert({
      where: { userId },
      update: { enabled },
      create: {
        userId,
        enabled,
      },
      select: {
        enabled: true,
      },
    });

    logger.info(
      "Updated API settings",
      { userId, enabled: settings.enabled },
      LOG_SOURCE
    );

    return NextResponse.json({
      enabled: settings.enabled,
    });
  } catch (error) {
    logger.error(
      "Failed to update API settings",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to update API settings" },
      { status: 500 }
    );
  }
}
