import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OutlookCalendarService } from "@/lib/outlook-calendar";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    // Get the account
    const account = await prisma.connectedAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.provider !== "OUTLOOK") {
      return NextResponse.json(
        { error: "Invalid Outlook account" },
        { status: 400 }
      );
    }

    // Initialize service and fetch calendars
    const outlookService = new OutlookCalendarService(prisma, account);
    const calendars = await outlookService.listCalendars();

    // Transform calendars to match the expected format
    const availableCalendars = calendars.map((calendar) => ({
      id: calendar.id,
      name: calendar.name,
      color: calendar.color || "#3b82f6",
      canEdit: calendar.canEdit ?? true,
    }));

    return NextResponse.json(availableCalendars);
  } catch (error) {
    logger.log("Failed to list available calendars", { error });
    return NextResponse.json(
      { error: "Failed to list calendars" },
      { status: 500 }
    );
  }
}
