import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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
    console.error("Failed to fetch log settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch log settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
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

    // Update settings
    const settings = await prisma.systemSettings.upsert({
      where: { id: "1" },
      update: {
        ...(logLevel && { logLevel }),
        ...(logDestination && { logDestination }),
        ...(logRetention && { logRetention }),
      },
      create: {
        id: "1",
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
    console.error("Failed to update log settings:", error);
    return NextResponse.json(
      { error: "Failed to update log settings" },
      { status: 500 }
    );
  }
}
