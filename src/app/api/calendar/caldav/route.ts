import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { formatISO } from "date-fns";
import {
  createCalDAVClient,
  loginToCalDAVServer,
  fetchCalDAVCalendars,
} from "./utils";

const LOG_SOURCE = "CalDAVCalendar";

/**
 * API route for adding a selected CalDAV calendar
 * POST /api/calendar/caldav
 * Body: { accountId, calendarUrl, name, color }
 */
export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { accountId, calendarId } = json;

    // Validate required fields
    if (!accountId) {
      logger.error(
        "Missing required fields for adding CalDAV calendar",
        { accountId: !!accountId },
        LOG_SOURCE
      );
      return NextResponse.json(
        { error: "Account ID and calendar URL are required" },
        { status: 400 }
      );
    }

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

    logger.info(
      `Adding CalDAV calendar for account: ${accountId}`,
      { caldavUrl: account.caldavUrl },
      LOG_SOURCE
    );

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

      // Fetch calendars to verify the calendar URL exists
      const calendars = await fetchCalDAVCalendars(client);

      const calendar = calendars.find((cal) => cal.url === calendarId);
      if (!calendar) {
        logger.error(
          `Calendar not found: ${calendarId}`,
          { accountId },
          LOG_SOURCE
        );
        return NextResponse.json(
          { error: "Calendar not found on the CalDAV server" },
          { status: 404 }
        );
      }



      const existingCalendar = await prisma.calendarFeed.findFirst({
        where: {
          url: calendarId,
        },
      });

      if (existingCalendar) {
        logger.info(
          `Calendar already exists: ${calendarId}`,
          { accountId },
          LOG_SOURCE
        );
        return NextResponse.json({
          success: true,
          calendar: {
            id: existingCalendar.id,
            name: existingCalendar.name,
            color: existingCalendar.color,
            url: existingCalendar.url,
          },
        });
      }
      // Add the calendar to the database
      let calendarColor = calendar.calendarColor || "#4285F4";
      if (typeof calendarColor !== "string") {
        calendarColor = "#4285F4";
      }
      let calendarName = calendar.displayName || "Unnamed Calendar";
      if (typeof calendarName !== "string") {
        calendarName = "Unnamed Calendar";
      }
      // const newCalendarOptions = ;
      const newCalendar = await prisma.calendarFeed.create({
        data: {
          name: calendarName,
          color: calendarColor,
          type: "CALDAV",
          url: calendarId,
          accountId,
          enabled: true,
          lastSync: formatISO(new Date()),
          syncToken: calendar.syncToken
        },
      });

      logger.info(
        `Successfully added CalDAV calendar: ${newCalendar.id}`,
        { name: newCalendar.name, accountId },
        LOG_SOURCE
      );

      return NextResponse.json({
        success: true,
        calendar: {
          id: newCalendar.id,
          name: newCalendar.name,
          color: newCalendar.color,
          url: newCalendar.url,
        },
      });
    } catch (error) {
      logger.error(
        `Error adding CalDAV calendar for account: ${accountId}`,
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack || null : null,
          calendarId,
        },
        LOG_SOURCE
      );
      return NextResponse.json(
        {
          error: "Failed to add CalDAV calendar",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error(
      "Error in CalDAV calendar route",
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
