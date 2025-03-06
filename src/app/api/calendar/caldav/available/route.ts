import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  createCalDAVClient,
  loginToCalDAVServer,
  fetchCalDAVCalendars,
} from "../utils";
import { getToken } from "next-auth/jwt";

const LOG_SOURCE = "CalDAVAvailable";

/**
 * API route for discovering and listing available CalDAV calendars
 * GET /api/calendar/caldav/available?accountId=123
 */
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
        "Unauthorized access attempt to CalDAV available calendars API",
        {},
        LOG_SOURCE
      );
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = token.sub;

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      logger.error("Missing accountId parameter", {}, LOG_SOURCE);
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    logger.info(
      `Fetching available calendars for account: ${accountId}`,
      {},
      LOG_SOURCE
    );

    // Get the account from the database and ensure it belongs to the current user
    const account = await prisma.connectedAccount.findUnique({
      where: {
        id: accountId,
        userId,
      },
    });

    if (!account) {
      logger.error(
        `Account not found or you don't have permission to access it: ${accountId}`,
        {},
        LOG_SOURCE
      );
      return NextResponse.json(
        {
          error: "Account not found or you don't have permission to access it",
        },
        { status: 404 }
      );
    }

    if (account.provider !== "CALDAV") {
      logger.error(
        `Account is not a CalDAV account: ${accountId}`,
        { type: account.provider },
        LOG_SOURCE
      );
      return NextResponse.json(
        { error: "Account is not a CalDAV account" },
        { status: 400 }
      );
    }

    // Ensure we have the required CalDAV fields
    if (!account.caldavUrl || !account.caldavUsername || !account.accessToken) {
      logger.error(
        `Missing required CalDAV fields for account: ${accountId}`,
        {
          hasUrl: !!account.caldavUrl,
          hasUsername: !!account.caldavUsername,
          hasPassword: !!account.accessToken,
        },
        LOG_SOURCE
      );
      return NextResponse.json(
        { error: "Account is missing required CalDAV fields" },
        { status: 400 }
      );
    }

    try {
      // Create a CalDAV client
      const client = createCalDAVClient(
        account.caldavUrl,
        account.caldavUsername,
        account.accessToken
      );

      // Login to the CalDAV server
      try {
        await loginToCalDAVServer(
          client,
          account.caldavUrl,
          account.caldavUsername
        );
      } catch (loginError) {
        logger.error(
          `Failed to login to CalDAV server for account: ${accountId}`,
          {
            error:
              loginError instanceof Error
                ? loginError.message
                : String(loginError),
            url: account.caldavUrl,
          },
          LOG_SOURCE
        );
        return NextResponse.json(
          {
            error:
              "Failed to authenticate with CalDAV server. Please check your credentials.",
            details:
              loginError instanceof Error
                ? loginError.message
                : String(loginError),
          },
          { status: 401 }
        );
      }

      // Fetch available calendars
      const calendars = await fetchCalDAVCalendars(client);

      // Get existing calendars for this account
      const existingCalendars = await prisma.calendarFeed.findMany({
        where: {
          accountId: account.id,
          type: "CALDAV",
          userId,
        },
        select: {
          url: true,
        },
      });

      const existingUrls = new Set(existingCalendars.map((cal) => cal.url));

      // Format the calendars for the response
      const formattedCalendars = calendars.map((cal) => ({
        id: cal.url, // Use url as id to match other providers
        url: cal.url,
        name: cal.displayName || "Unnamed Calendar",
        color: cal.calendarColor || "#4285F4",
        description: cal.description || "",
        alreadyAdded: existingUrls.has(cal.url),
        canEdit: true, // Assume all calendars can be edited for consistency with Outlook
      }));

      logger.info(
        `Found ${calendars.length} available calendars for account: ${accountId}`,
        { alreadyAdded: existingCalendars.length },
        LOG_SOURCE
      );

      // Return the array directly, consistent with Google and Outlook
      return NextResponse.json(
        formattedCalendars.filter((cal) => !cal.alreadyAdded)
      );
    } catch (error) {
      logger.error(
        `Error fetching available calendars for account: ${accountId}`,
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack || null : null,
        },
        LOG_SOURCE
      );
      return NextResponse.json(
        {
          error: "Failed to fetch available calendars",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error(
      "Error in CalDAV available route",
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack || null : null,
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      {
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
