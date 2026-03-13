import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { OutlookCalendarService } from "@/lib/outlook-calendar";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "OutlookAvailableCalendarsAPI";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const searchParams = req.nextUrl.searchParams;
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    // Get the account and ensure it belongs to the current user
    const account = await prisma.connectedAccount.findUnique({
      where: {
        id: accountId,
        userId,
      },
      include: {
        calendars: true,
      },
    });

    if (!account) {
      return NextResponse.json(
        {
          error: "Account not found or you don't have permission to access it",
        },
        { status: 404 }
      );
    }

    if (account.provider !== "OUTLOOK") {
      return NextResponse.json(
        { error: "Invalid account type" },
        { status: 400 }
      );
    }

    // Initialize service and fetch calendars
    const outlookService = new OutlookCalendarService(account);
    const calendars = await outlookService.listCalendars();

    // Transform calendars to match the expected format
    const availableCalendars = calendars
      .map((calendar) => ({
        id: calendar.id,
        name: calendar.name,
        color: calendar.color || "#3b82f6",
        canEdit: calendar.canEdit ?? true,
      }))
      .filter((cal) => {
        // Only include calendars that:
        // 1. Have an ID and name
        // 2. Are not already connected
        // 3. User has write access
        return cal.id && !account.calendars.some((f) => f.url === cal.id);
      });

    return NextResponse.json(availableCalendars);
  } catch (error) {
    logger.error(
      "Failed to list available calendars",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to list calendars" },
      { status: 500 }
    );
  }
}
