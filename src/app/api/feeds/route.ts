import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "calendar-feeds-route";

interface CalendarFeedUpdate {
  id: string;
  enabled?: boolean;
  color?: string | null;
}

// List all calendar feeds
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
        "Unauthorized access attempt to calendar feeds API",
        {},
        LOG_SOURCE
      );
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = token.sub;

    const feeds = await prisma.calendarFeed.findMany({
      where: {
        // Filter by the current user's ID
        userId,
      },
      include: {
        account: {
          select: {
            id: true,
            provider: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(feeds);
  } catch (error) {
    logger.error(
      "Failed to fetch calendar feeds:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch calendar feeds" },
      { status: 500 }
    );
  }
}

// Create a new feed
export async function POST(request: NextRequest) {
  try {
    // Get the user token from the request
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If there's no token, return unauthorized
    if (!token) {
      logger.warn(
        "Unauthorized access attempt to create calendar feed",
        {},
        LOG_SOURCE
      );
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = token.sub;

    const feedData = await request.json();
    const created = await prisma.calendarFeed.create({
      data: {
        ...feedData,
        // Associate the feed with the current user
        userId,
      },
    });
    return NextResponse.json(created);
  } catch (error) {
    logger.error(
      "Failed to create feed:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to create feed" },
      { status: 500 }
    );
  }
}

// Batch update feeds
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
        "Unauthorized access attempt to update calendar feeds",
        {},
        LOG_SOURCE
      );
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = token.sub;

    const { feeds } = await request.json();

    // Use transaction to ensure all updates succeed or none do
    await prisma.$transaction(
      feeds.map((feed: CalendarFeedUpdate) =>
        prisma.calendarFeed.update({
          where: {
            id: feed.id,
            // Ensure the feed belongs to the current user
            userId,
          },
          data: feed,
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "Failed to update feeds:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to update feeds" },
      { status: 500 }
    );
  }
}

// Update calendar feed settings
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
        "Unauthorized access attempt to update calendar feed",
        {},
        LOG_SOURCE
      );
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = token.sub;

    const { id, enabled, color } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Feed ID is required" },
        { status: 400 }
      );
    }

    const feed = await prisma.calendarFeed.update({
      where: {
        id,
        // Ensure the feed belongs to the current user
        userId,
      },
      data: {
        enabled: enabled !== undefined ? enabled : undefined,
        color: color !== undefined ? color : undefined,
      },
    });

    return NextResponse.json(feed);
  } catch (error) {
    logger.error(
      "Failed to update calendar feed:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to update calendar feed" },
      { status: 500 }
    );
  }
}

// Delete calendar feed
export async function DELETE(request: NextRequest) {
  try {
    // Get the user token from the request
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If there's no token, return unauthorized
    if (!token) {
      logger.warn(
        "Unauthorized access attempt to delete calendar feed",
        {},
        LOG_SOURCE
      );
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = token.sub;

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Feed ID is required" },
        { status: 400 }
      );
    }

    await prisma.calendarFeed.delete({
      where: {
        id,
        // Ensure the feed belongs to the current user
        userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "Failed to delete calendar feed:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to delete calendar feed" },
      { status: 500 }
    );
  }
}
