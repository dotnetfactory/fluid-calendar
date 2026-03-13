import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "AutoScheduleSettingsAPI";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Get the auto schedule settings or create default ones if they don't exist
    const settings = await prisma.autoScheduleSettings.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        workDays: JSON.stringify([1, 2, 3, 4, 5]), // Monday to Friday
        workHourStart: 9, // 9 AM
        workHourEnd: 17, // 5 PM
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    logger.error(
      "Failed to fetch auto schedule settings",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch auto schedule settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const updates = await request.json();

    const settings = await prisma.autoScheduleSettings.upsert({
      where: { userId },
      update: updates,
      create: {
        userId,
        workDays: JSON.stringify([1, 2, 3, 4, 5]), // Monday to Friday
        workHourStart: 9, // 9 AM
        workHourEnd: 17, // 5 PM
        ...updates,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    logger.error(
      "Failed to update auto schedule settings",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to update auto schedule settings" },
      { status: 500 }
    );
  }
}
