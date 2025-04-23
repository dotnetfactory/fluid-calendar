import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "SystemSettingsAPI";

export async function GET(request: NextRequest) {
  // Check if user is admin
  const authResponse = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    // Get the first system settings record, or create it if it doesn't exist
    const settings = await prisma.$transaction(async (tx) => {
      // Check if any SystemSettings record exists
      const existingSettings = await tx.systemSettings.findFirst();

      if (existingSettings) {
        return existingSettings;
      } else {
        // Create a new record with default ID
        return tx.systemSettings.create({
          data: {
            id: "default",
            logLevel: "none",
            disableHomepage: false,
          },
        });
      }
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

export async function PATCH(request: NextRequest) {
  // Check if user is admin
  const authResponse = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const updates = await request.json();

    const settings = await prisma.$transaction(async (tx) => {
      // Check if any SystemSettings record exists
      const existingSettings = await tx.systemSettings.findFirst();

      if (existingSettings) {
        // Update the existing record
        return tx.systemSettings.update({
          where: { id: existingSettings.id },
          data: updates,
        });
      } else {
        // Create a new record with default ID
        return tx.systemSettings.create({
          data: {
            id: "default",
            ...updates,
          },
        });
      }
    });

    // Log if the homepage setting was updated
    if ("disableHomepage" in updates) {
      logger.debug(
        `Homepage setting updated: ${updates.disableHomepage}`,
        { disableHomepage: updates.disableHomepage },
        LOG_SOURCE
      );
    }

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
