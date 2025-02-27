import { NextResponse } from "next/server";
import { DAVClient } from "tsdav";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "CalDAVAuth";

/**
 * Helper function to ensure a URL is properly formatted
 * @param baseUrl The base URL (e.g., https://caldav.fastmail.com)
 * @param path The path to append (e.g., /dav/calendars/user/email/)
 * @returns A properly formatted absolute URL
 */
function formatAbsoluteUrl(baseUrl: string, path?: string): string {
  // If no path, ensure baseUrl is a valid URL
  if (!path) {
    try {
      // Validate that baseUrl is a valid URL
      new URL(baseUrl);
      return baseUrl;
    } catch (_e) {
      // If baseUrl is not a valid URL, try to fix it
      if (!baseUrl.startsWith("http")) {
        return `https://${baseUrl}`;
      }
      throw new Error(`Invalid base URL: ${baseUrl}`);
    }
  }

  // If path is already an absolute URL, validate and return it
  if (path.startsWith("http")) {
    try {
      // Validate that path is a valid URL
      new URL(path);
      return path;
    } catch (_e) {
      throw new Error(`Invalid URL in path: ${path}`);
    }
  }

  // Ensure baseUrl doesn't end with a slash if path starts with one
  const base =
    baseUrl.endsWith("/") && path.startsWith("/")
      ? baseUrl.slice(0, -1)
      : baseUrl;

  // Ensure path starts with a slash
  const pathWithSlash = path.startsWith("/") ? path : `/${path}`;

  // Construct the full URL
  const fullUrl = `${base}${pathWithSlash}`;

  // Validate the constructed URL
  try {
    new URL(fullUrl);
    return fullUrl;
  } catch (_e) {
    // If the URL is invalid, try to fix it
    if (!fullUrl.startsWith("http")) {
      const fixedUrl = `https://${fullUrl}`;
      try {
        new URL(fixedUrl);
        return fixedUrl;
      } catch (_e) {
        throw new Error(
          `Could not create valid URL from: ${base} and ${pathWithSlash}`
        );
      }
    }
    throw new Error(
      `Invalid URL constructed from: ${base} and ${pathWithSlash}`
    );
  }
}

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
      const client = new DAVClient({
        serverUrl,
        credentials: {
          username,
          password,
        },
        authMethod: "Basic" as const,
        defaultAccountType: "caldav" as const,
      });
      let caldavPath = path;
      // Try to login to verify credentials
      try {
        await client.login();
        logger.info(
          "Successfully logged in to CalDAV server",
          { serverUrl, username },
          LOG_SOURCE
        );

        // If this is Fastmail and no path is provided, set a default path

        if (!path && serverUrl.includes("fastmail.com")) {
          caldavPath = `/dav/calendars/user/${encodeURIComponent(username)}/`;
          logger.info(
            "Detected Fastmail server, using default path",
            { caldavPath },
            LOG_SOURCE
          );
        }
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

      // If path is provided, try to fetch calendars to verify the path
      if (caldavPath) {
        try {
          // Construct the full URL if path is provided
          const fullUrl = formatAbsoluteUrl(serverUrl, caldavPath);

          logger.info(
            `Verifying CalDAV path: ${caldavPath}`,
            { fullUrl, username },
            LOG_SOURCE
          );

          // Ensure client account has necessary properties
          if (client.account && !client.account.homeUrl) {
            // Set homeUrl if not discovered during login (common with Fastmail)
            const homeUrl = formatAbsoluteUrl(serverUrl, caldavPath);

            client.account.homeUrl = homeUrl;
            logger.info(
              "Setting homeUrl manually for path validation",
              { homeUrl },
              LOG_SOURCE
            );
          }

          const calendars = await client.fetchCalendars();

          logger.info(
            `Found ${calendars.length} calendars at path`,
            { caldavPath, username },
            LOG_SOURCE
          );
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
