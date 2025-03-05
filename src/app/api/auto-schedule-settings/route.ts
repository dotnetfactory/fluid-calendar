import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getCurrentUserId } from "@/lib/auth/current-user";

const LOG_SOURCE = "AutoScheduleSettingsAPI";

export async function GET() {
  try {
    const userId = await getCurrentUserId();

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

export async function PATCH(request: Request) {
  try {
    const userId = await getCurrentUserId();
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
