import { NextResponse, NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import {
  formatAbsoluteUrl,
  createCalDAVClient,
  loginToCalDAVServer,
  handleFastmailPath,
  fetchCalDAVCalendars,
} from "../utils";
import { DAVCalendar } from "tsdav";
import { getToken } from "next-auth/jwt";

const LOG_SOURCE = "CalDAVTest";

/**
 * API route for testing a CalDAV connection
 * POST /api/calendar/caldav/test
 * Body: { serverUrl, username, password, path }
 */
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
        "Unauthorized access attempt to CalDAV test API",
        {},
        LOG_SOURCE
      );
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { serverUrl, username, password, path } = await request.json();

    // Validate required fields
    if (!serverUrl || !username || !password) {
      logger.error(
        "Missing required fields for CalDAV test",
        { serverUrl: !!serverUrl, username: !!username, password: !!password },
        LOG_SOURCE
      );
      return NextResponse.json(
        { error: "Server URL, username, and password are required" },
        { status: 400 }
      );
    }

    logger.info(
      `Testing CalDAV connection to: ${serverUrl}`,
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
        logger.error(
          "Failed to login to CalDAV server",
          {
            error:
              loginError instanceof Error
                ? loginError.message
                : String(loginError),
            serverUrl,
            username,
          },
          LOG_SOURCE
        );
        return NextResponse.json(
          {
            success: false,
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
      let calendars: DAVCalendar[] = [];
      if (caldavPath) {
        try {
          logger.info(
            `Testing CalDAV path: ${caldavPath}`,
            { fullUrl: formatAbsoluteUrl(serverUrl, caldavPath), username },
            LOG_SOURCE
          );

          calendars = await fetchCalDAVCalendars(client);
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
              success: false,
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
      } else {
        // If no path is provided, try to discover calendars
        try {
          logger.info(
            "No path provided, attempting to discover calendars",
            { serverUrl, username },
            LOG_SOURCE
          );

          calendars = await fetchCalDAVCalendars(client);
        } catch (discoverError) {
          logger.error(
            "Failed to discover calendars",
            {
              error:
                discoverError instanceof Error
                  ? discoverError.message
                  : String(discoverError),
              serverUrl,
              username,
            },
            LOG_SOURCE
          );
          // Don't return an error here, as we'll try to use the principal URL next
        }
      }

      // If we found calendars, return them
      if (calendars.length > 0) {
        logger.info(
          `Found ${calendars.length} calendars`,
          { serverUrl, username, path: caldavPath || "none" },
          LOG_SOURCE
        );

        // Format the calendars for the response
        const formattedCalendars = calendars.map((cal) => ({
          url: cal.url,
          name: cal.displayName || "Unnamed Calendar",
          color: cal.calendarColor || "#4285F4",
          description: cal.description || "",
        }));

        return NextResponse.json({
          success: true,
          calendars: formattedCalendars,
          serverUrl,
          username,
          path: caldavPath || "",
        });
      }

      // If we didn't find calendars, try to use the principal URL
      if (client.account?.principalUrl) {
        try {
          logger.info(
            "Trying to use principal URL to find calendars",
            { principalUrl: client.account.principalUrl, username },
            LOG_SOURCE
          );

          // Extract the path from the principal URL
          const principalUrlObj = new URL(client.account.principalUrl);
          const principalPath = principalUrlObj.pathname;

          // Try to fetch calendars using the principal path
          calendars = await fetchCalDAVCalendars(client);

          if (calendars.length > 0) {
            logger.info(
              `Found ${calendars.length} calendars using principal URL`,
              { serverUrl, username, principalPath },
              LOG_SOURCE
            );

            // Format the calendars for the response
            const formattedCalendars = calendars.map((cal) => ({
              url: cal.url,
              name: cal.displayName || "Unnamed Calendar",
              color: cal.calendarColor || "#4285F4",
              description: cal.description || "",
            }));

            return NextResponse.json({
              success: true,
              calendars: formattedCalendars,
              serverUrl,
              username,
              path: principalPath,
            });
          }
        } catch (principalError) {
          logger.error(
            "Failed to use principal URL to find calendars",
            {
              error:
                principalError instanceof Error
                  ? principalError.message
                  : String(principalError),
              principalUrl: client.account.principalUrl,
              serverUrl,
              username,
            },
            LOG_SOURCE
          );
          // Don't return an error here, as we'll try to use the home URL next
        }
      }

      // If we still didn't find calendars, try to use the home URL
      if (client.account?.homeUrl) {
        try {
          logger.info(
            "Trying to use home URL to find calendars",
            { homeUrl: client.account.homeUrl, username },
            LOG_SOURCE
          );

          // Extract the path from the home URL
          const homeUrlObj = new URL(client.account.homeUrl);
          const homePath = homeUrlObj.pathname;

          // Try to fetch calendars using the home path
          calendars = await fetchCalDAVCalendars(client);

          if (calendars.length > 0) {
            logger.info(
              `Found ${calendars.length} calendars using home URL`,
              { serverUrl, username, homePath },
              LOG_SOURCE
            );

            // Format the calendars for the response
            const formattedCalendars = calendars.map((cal) => ({
              url: cal.url,
              name: cal.displayName || "Unnamed Calendar",
              color: cal.calendarColor || "#4285F4",
              description: cal.description || "",
            }));

            return NextResponse.json({
              success: true,
              calendars: formattedCalendars,
              serverUrl,
              username,
              path: homePath,
            });
          }
        } catch (homeError) {
          logger.error(
            "Failed to use home URL to find calendars",
            {
              error:
                homeError instanceof Error
                  ? homeError.message
                  : String(homeError),
              homeUrl: client.account.homeUrl,
              serverUrl,
              username,
            },
            LOG_SOURCE
          );
        }
      }

      // If we still didn't find calendars, return an error
      logger.error(
        "Could not find any calendars",
        { serverUrl, username, path: caldavPath || "none" },
        LOG_SOURCE
      );
      return NextResponse.json(
        {
          success: false,
          error:
            "Could not find any calendars. Please check the server URL and path.",
        },
        { status: 404 }
      );
    } catch (error) {
      logger.error(
        "Error testing CalDAV connection",
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
          success: false,
          error: "Failed to test CalDAV connection",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error(
      "Error in CalDAV test route",
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack || null : null,
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
