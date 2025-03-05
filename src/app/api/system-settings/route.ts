import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "SystemSettingsAPI";

export async function GET() {
  try {
    // Get the first (and only) system settings record, or create it if it doesn't exist
    const settings = await prisma.systemSettings.upsert({
      where: { id: "1" },
      update: {},
      create: {
        id: "1",
        logLevel: "none",
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    logger.error(
      "Failed to fetch system settings",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch system settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const updates = await request.json();
    const settings = await prisma.systemSettings.upsert({
      where: { id: "1" },
      update: updates,
      create: {
        id: "1",
        ...updates,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    logger.error(
      "Failed to update system settings",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to update system settings" },
      { status: 500 }
    );
  }
}
