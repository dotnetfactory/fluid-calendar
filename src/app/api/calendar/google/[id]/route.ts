import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { GaxiosError } from "gaxios";
import { getToken } from "next-auth/jwt";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "GoogleCalendarIdAPI";

interface UpdateRequest {
  enabled?: boolean;
  color?: string;
}

// Update a Google Calendar feed
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the user token from the request
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If there's no token, return unauthorized
    if (!token) {
      logger.warn(
        "Unauthorized access attempt to Google calendar API",
        {},
        LOG_SOURCE
      );
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = token.sub;

    const { id } = await params;
    const feed = await prisma.calendarFeed.findUnique({
      where: {
        id,
        userId,
      },
      include: { account: true },
    });

    if (!feed || feed.type !== "GOOGLE" || !feed.url || !feed.accountId) {
      return NextResponse.json(
        { error: "Invalid calendar feed" },
        { status: 400 }
      );
    }

    const updates = (await request.json()) as UpdateRequest;

    // Update only local properties
    const updatedFeed = await prisma.calendarFeed.update({
      where: { id },
      data: {
        enabled: updates.enabled,
        color: updates.color,
      },
    });

    return NextResponse.json(updatedFeed);
  } catch (error) {
    console.error("Failed to update Google calendar:", error);
    if (error instanceof GaxiosError && Number(error.code) === 401) {
      return NextResponse.json(
        { error: "Authentication failed. Please try signing in again." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update calendar" },
      { status: 500 }
    );
  }
}

// Delete a Google Calendar feed
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the user token from the request
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If there's no token, return unauthorized
    if (!token) {
      logger.warn(
        "Unauthorized access attempt to Google calendar API",
        {},
        LOG_SOURCE
      );
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = token.sub;

    const { id } = await params;
    const feed = await prisma.calendarFeed.findUnique({
      where: {
        id,
        userId,
      },
    });

    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    // Delete the feed
    await prisma.calendarFeed.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete Google calendar:", error);
    if (error instanceof GaxiosError && Number(error.code) === 401) {
      return NextResponse.json(
        { error: "Authentication failed. Please try signing in again." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete calendar" },
      { status: 500 }
    );
  }
}
