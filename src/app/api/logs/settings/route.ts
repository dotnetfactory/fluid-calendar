import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "LogSettingsAPI";

export async function GET(request: NextRequest) {
  try {
    // Get the user token from the request
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If there's no token, return unauthorized
    if (!token) {
      logger.warn(
        "Unauthorized access attempt to log settings API",
        {},
        LOG_SOURCE
      );
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user is admin
    if (token.role !== "ADMIN") {
      logger.warn(
        "Non-admin user attempted to access log settings",
        { userId: token.sub ?? "unknown" },
        LOG_SOURCE
      );
      return new NextResponse("Forbidden", { status: 403 });
    }

    const settings = await prisma.systemSettings.findFirst();
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
    // Get the user token from the request
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If there's no token, return unauthorized
    if (!token) {
      logger.warn(
        "Unauthorized access attempt to log settings API",
        {},
        LOG_SOURCE
      );
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user is admin
    if (token.role !== "ADMIN") {
      logger.warn(
        "Non-admin user attempted to update log settings",
        { userId: token.sub ?? "unknown" },
        LOG_SOURCE
      );
      return new NextResponse("Forbidden", { status: 403 });
    }

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
