import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  formatAbsoluteUrl,
  createCalDAVClient,
  loginToCalDAVServer,
  handleFastmailPath,
  fetchCalDAVCalendars,
} from "../utils";

const LOG_SOURCE = "CalDAVAuth";

/**
 * API route for authenticating and adding a CalDAV account
 * POST /api/calendar/caldav/auth
 * Body: { serverUrl, username, password, path }
 */
export async function POST(request: Request) {
  try {
    const { serverUrl, username, password, path } = await request.json();

    // Validate required fields
    if (!serverUrl || !username || !password) {
      logger.error(
        "Missing required fields for CalDAV auth",
        { serverUrl: !!serverUrl, username: !!username, password: !!password },
        LOG_SOURCE
      );
      return NextResponse.json(
        { error: "Server URL, username, and password are required" },
        { status: 400 }
      );
    }

    logger.info(
      `Attempting to connect to CalDAV server: ${serverUrl}`,
      { path: path || "none", username },
      LOG_SOURCE
    );

    try {
      // Create a DAVClient instance
      const client = createCalDAVClient(serverUrl, username, password);

      // Try to login to verify credentials
      try {
        await loginToCalDAVServer(client, serverUrl, username);
      } catch (loginError) {
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

      // Handle Fastmail-specific path formatting
      const caldavPath = handleFastmailPath(serverUrl, path, username);

      // If path is provided, try to fetch calendars to verify the path
      if (caldavPath) {
        try {
          logger.info(
            `Verifying CalDAV path: ${caldavPath}`,
            { fullUrl: formatAbsoluteUrl(serverUrl, caldavPath), username },
            LOG_SOURCE
          );

          await fetchCalDAVCalendars(client);
        } catch (pathError) {
          logger.error(
            "Failed to validate CalDAV path",
            {
              error:
                pathError instanceof Error
                  ? pathError.message
                  : String(pathError),
              caldavPath,
              serverUrl,
              username,
            },
            LOG_SOURCE
          );
          return NextResponse.json(
            {
              error:
                "Failed to validate the CalDAV path. Please check the path and try again.",
              details:
                pathError instanceof Error
                  ? pathError.message
                  : String(pathError),
            },
            { status: 400 }
          );
        }
      }

      // Successfully connected, add the account to the database
      const fullUrl = caldavPath
        ? formatAbsoluteUrl(serverUrl, caldavPath)
        : serverUrl;

      const account = await prisma.connectedAccount.create({
        data: {
          provider: "CALDAV",
          email: username,
          caldavUrl: fullUrl,
          caldavUsername: username,
          accessToken: password, // For CalDAV, we store the password as the access token
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Set expiry to 1 year from now
        },
      });

      logger.info(
        "Successfully added CalDAV account",
        { id: account.id, username },
        LOG_SOURCE
      );

      return NextResponse.json({ success: true, accountId: account.id });
    } catch (error) {
      logger.error(
        "Error connecting to CalDAV server",
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack || null : null,
          serverUrl,
          username,
        },
        LOG_SOURCE
      );
      return NextResponse.json(
        {
          error:
            "Failed to connect to CalDAV server. Please check your credentials.",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error(
      "Error in CalDAV auth route",
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
