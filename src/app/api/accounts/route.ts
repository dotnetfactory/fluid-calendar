import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "accounts-route";

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
        "Unauthorized access attempt to accounts API",
        {},
        LOG_SOURCE
      );
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = token.sub;

    // Get accounts filtered by the current user's ID
    const accounts = await prisma.connectedAccount.findMany({
      where: {
        userId,
      },
      include: {
        calendars: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      accounts.map((account) => ({
        id: account.id,
        provider: account.provider,
        email: account.email,
        calendars: account.calendars,
      }))
    );
  } catch (error) {
    logger.error(
      "Failed to list accounts:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to list accounts" },
      { status: 500 }
    );
  }
}

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
        "Unauthorized access attempt to delete account",
        {},
        LOG_SOURCE
      );
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = token.sub;

    const { accountId } = await request.json();
    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    // Check if the account belongs to the current user
    const account = await prisma.connectedAccount.findUnique({
      where: {
        id: accountId,
        userId,
      },
    });

    if (!account) {
      return NextResponse.json(
        {
          error: "Account not found or you don't have permission to delete it",
        },
        { status: 404 }
      );
    }

    // First delete all calendar feeds associated with this account
    await prisma.calendarFeed.deleteMany({
      where: {
        accountId,
        userId,
      },
    });

    // Then delete the account
    await prisma.connectedAccount.delete({
      where: {
        id: accountId,
        userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "Failed to remove account:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to remove account" },
      { status: 500 }
    );
  }
}
