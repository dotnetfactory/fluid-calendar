import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getToken } from "next-auth/jwt";

const LOG_SOURCE = "IntegrationSettingsAPI";

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
        "Unauthorized access attempt to integration settings API",
        {},
        LOG_SOURCE
      );
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = token.sub;

    if (!userId) {
      logger.warn("No user ID found in token", {}, LOG_SOURCE);
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get the integration settings or create default ones if they don't exist
    const settings = await prisma.integrationSettings.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    logger.error(
      "Failed to fetch integration settings",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch integration settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Get the user token from the request
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If there's no token, return unauthorized
    if (!token) {
      logger.warn(
        "Unauthorized access attempt to integration settings API",
        {},
        LOG_SOURCE
      );
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = token.sub;

    if (!userId) {
      logger.warn("No user ID found in token", {}, LOG_SOURCE);
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const updates = await request.json();

    const settings = await prisma.integrationSettings.upsert({
      where: { userId },
      update: updates,
      create: {
        userId,
        ...updates,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    logger.error(
      "Failed to update integration settings",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to update integration settings" },
      { status: 500 }
    );
  }
}
