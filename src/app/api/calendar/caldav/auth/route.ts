import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import {
  classifyCalDAVError,
  createCalDAVClient,
  fetchCalDAVCalendars,
  formatAbsoluteUrl,
  handleFastmailPath,
  loginToCalDAVServer,
} from "../utils";

const LOG_SOURCE = "CalDAVAuth";

/**
 * API route for authenticating and adding a CalDAV account
 * POST /api/calendar/caldav/auth
 * Body: { serverUrl, username, password, path }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

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
        const classified = classifyCalDAVError(loginError);
        logger.error(
          "Failed to login to CalDAV server",
          {
            kind: classified.kind,
            error: classified.details,
            serverUrl,
            username,
          },
          LOG_SOURCE
        );
        return NextResponse.json(
          {
            error: classified.message,
            details: classified.details,
          },
          { status: classified.status }
        );
      }

      // Handle Fastmail-specific path formatting
      const caldavPath = handleFastmailPath(serverUrl, path, username);

      // If path is provided, try to fetch calendars to verify the path
      if (caldavPath) {
        // Build the absolute URL outside the network try so a malformed path
        // (a local construction error) stays a 400 bad-path response and is not
        // misclassified as an upstream connection failure.
        let fullUrl: string;
        try {
          fullUrl = formatAbsoluteUrl(serverUrl, caldavPath);
        } catch (urlError) {
          logger.error(
            "Invalid CalDAV path",
            {
              error:
                urlError instanceof Error ? urlError.message : String(urlError),
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
                urlError instanceof Error ? urlError.message : String(urlError),
            },
            { status: 400 }
          );
        }

        try {
          logger.info(
            `Verifying CalDAV path: ${caldavPath}`,
            { fullUrl, username },
            LOG_SOURCE
          );

          await fetchCalDAVCalendars(client);
        } catch (pathError) {
          // Path validation runs another CalDAV network call after login; a
          // connection/TLS failure here must be reported as a connection error,
          // not a bad-path error. Non-connection failures keep the 400 path
          // message.
          const classified = classifyCalDAVError(pathError);
          logger.error(
            "Failed to validate CalDAV path",
            {
              kind: classified.kind,
              error: classified.details,
              caldavPath,
              serverUrl,
              username,
            },
            LOG_SOURCE
          );
          if (classified.kind === "connection") {
            return NextResponse.json(
              { error: classified.message, details: classified.details },
              { status: classified.status }
            );
          }
          return NextResponse.json(
            {
              error:
                "Failed to validate the CalDAV path. Please check the path and try again.",
              details: classified.details,
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
          accessToken: password, // Store password as access token
          userId, // Associate with the current user
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
