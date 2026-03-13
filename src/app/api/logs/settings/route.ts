import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "LogSettingsAPI";

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const authResponse = await requireAdmin(request);
    if (authResponse) return authResponse;

    const settings = await prisma.systemSettings.findFirst();

    // If no settings exist, create default settings
    if (!settings) {
      logger.info(
        "No system settings found, creating defaults",
        {},
        LOG_SOURCE
      );

      const defaultSettings = await prisma.systemSettings.create({
        data: {
          logLevel: "error",
          logDestination: "db",
          logRetention: {
            error: 30,
            warn: 14,
            info: 7,
            debug: 3,
          },
          publicSignup: false,
        },
      });

      return NextResponse.json({
        logLevel: defaultSettings.logLevel,
        logDestination: defaultSettings.logDestination,
        logRetention: defaultSettings.logRetention,
      });
    }

    return NextResponse.json({
      logLevel: settings?.logLevel || "none",
      logDestination: settings?.logDestination || "db",
      logRetention: settings?.logRetention || {
        error: 30,
        warn: 14,
        info: 7,
        debug: 3,
      },
    });
  } catch (error) {
    logger.error(
      "Failed to fetch log settings:",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch log settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check if user is admin
    const authResponse = await requireAdmin(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { logLevel, logDestination, logRetention } = body;

    // Validate log level
    if (
      logLevel &&
      !["none", "debug", "info", "warn", "error"].includes(logLevel)
    ) {
      return NextResponse.json({ error: "Invalid log level" }, { status: 400 });
    }

    // Validate log destination
    if (logDestination && !["db", "file", "both"].includes(logDestination)) {
      return NextResponse.json(
        { error: "Invalid log destination" },
        { status: 400 }
      );
    }

    // Validate retention periods
    if (logRetention) {
      const levels = ["error", "warn", "info", "debug"];
      for (const level of levels) {
        if (
          typeof logRetention[level] !== "number" ||
          logRetention[level] < 1
        ) {
          return NextResponse.json(
            { error: `Invalid retention period for ${level}` },
            { status: 400 }
          );
        }
      }
    }

    const settingsInDb = await prisma.systemSettings.findFirst();

    // Update or create settings
    const settings = await prisma.systemSettings.upsert({
      where: { id: settingsInDb?.id ?? "NEW" },
      update: {
        ...(logLevel && { logLevel }),
        ...(logDestination && { logDestination }),
        ...(logRetention && { logRetention }),
      },
      create: {
        logLevel: logLevel || "none",
        logDestination: logDestination || "db",
        logRetention: logRetention || {
          error: 30,
          warn: 14,
          info: 7,
          debug: 3,
        },
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    logger.error(
      "Failed to update log settings:",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to update log settings" },
      { status: 500 }
    );
  }
}
