import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "accounts-route";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

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
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

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
