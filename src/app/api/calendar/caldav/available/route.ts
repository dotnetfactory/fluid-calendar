import { NextResponse } from "next/server";
import { DAVClient } from "tsdav";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "CalDAVAvailable";

/**
 * API route for discovering and listing available CalDAV calendars
 * GET /api/calendar/caldav/available?accountId=123
 */
export async function GET(request: Request) {
  try {
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

    // Get the account from the database
    const account = await prisma.connectedAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      logger.error(`Account not found: ${accountId}`, {}, LOG_SOURCE);
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
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
      // Create a DAVClient instance
      const client = new DAVClient({
        serverUrl: account.caldavUrl,
        credentials: {
          username: account.caldavUsername,
          password: account.accessToken, // For CalDAV, we store the password as the access token
        },
        authMethod: "Basic",
        defaultAccountType: "caldav",
      });

      // Login to the CalDAV server
      try {
        await client.login();
        logger.info(
          `Successfully logged in to CalDAV server for account: ${accountId}`,
          { url: account.caldavUrl },
          LOG_SOURCE
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
      const calendars = await client.fetchCalendars();

      logger.info(
        `Found ${calendars.length} calendars for account: ${accountId}`,
        {},
        LOG_SOURCE
      );

      // Transform the calendars to a simpler format
      const calendarList = calendars.map((calendar) => ({
        id: calendar.url,
        name: calendar.displayName || "Unnamed Calendar",
        description: calendar.description || "",
        color: calendar.calendarColor || "#4285F4",
        url: calendar.url,
      }));

      return NextResponse.json(calendarList);
    } catch (error) {
      logger.error(
        `Error fetching calendars for account: ${accountId}`,
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack || null : null,
          url: account.caldavUrl,
        },
        LOG_SOURCE
      );
      return NextResponse.json(
        {
          error: "Failed to fetch calendars from CalDAV server",
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
