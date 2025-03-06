import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGoogleCalendarClient } from "@/lib/google-calendar";
import { GaxiosError } from "gaxios";
import { getToken } from "next-auth/jwt";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "GoogleAvailableCalendarsAPI";

// Get available (unconnected) calendars for an account
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
        "Unauthorized access attempt to Google available calendars API",
        {},
        LOG_SOURCE
      );
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = token.sub;

    const url = new URL(request.url);
    const accountId = url.searchParams.get("accountId");

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

    if (account.provider !== "GOOGLE") {
      return NextResponse.json(
        { error: "Invalid account type" },
        { status: 400 }
      );
    }

    // Create calendar client
    const calendar = await getGoogleCalendarClient(accountId);

    // Get list of calendars
    const calendarList = await calendar.calendarList.list();
    const availableCalendars = calendarList.data.items
      ?.filter((cal) => {
        // Only include calendars that:
        // 1. Have an ID and name
        // 2. Are not already connected
        // 3. User has write access
        return (
          cal.id &&
          cal.summary &&
          !account.calendars.some((f) => f.url === cal.id)
        );
      })
      .map((cal) => ({
        id: cal.id,
        name: cal.summary,
        color: cal.backgroundColor,
        accessRole: cal.accessRole,
      }));

    return NextResponse.json(availableCalendars || []);
  } catch (error) {
    logger.error(
      "Failed to list available calendars:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    if (error instanceof GaxiosError && Number(error.code) === 401) {
      return NextResponse.json(
        { error: "Authentication failed. Please try signing in again." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Failed to list calendars" },
      { status: 500 }
    );
  }
}
