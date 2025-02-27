import { NextResponse } from "next/server";
import { DAVClient } from "tsdav";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "CalDAVTest";

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

// Define types for test results
interface TestStep {
  step: string;
  status: "pending" | "success" | "failed";
  error?: string;
  calendars?: number;
  calendarNames?: string[];
}

interface TestResult {
  steps: TestStep[];
  success: boolean;
  error: string | null;
  details: string | null;
}

/**
 * API route for testing CalDAV connection
 * POST /api/calendar/caldav/test
 * Body: { serverUrl, username, password, path }
 */
export async function POST(request: Request) {
  try {
    const {
      serverUrl: rawServerUrl,
      username,
      password,
      path,
    } = await request.json();

    // Validate required fields
    if (!rawServerUrl || !username || !password) {
      return NextResponse.json(
        { error: "Server URL, username, and password are required" },
        { status: 400 }
      );
    }

    // Ensure serverUrl is a valid URL
    let serverUrl;
    try {
      // Try to format and validate the serverUrl
      serverUrl = formatAbsoluteUrl(rawServerUrl);
      new URL(serverUrl); // This will throw if invalid
    } catch (urlError: unknown) {
      const errorMessage =
        urlError instanceof Error ? urlError.message : String(urlError);
      logger.error(
        "Invalid server URL",
        { serverUrl: rawServerUrl, error: errorMessage },
        LOG_SOURCE
      );
      return NextResponse.json(
        { error: `Invalid server URL: ${errorMessage}` },
        { status: 400 }
      );
    }

    logger.info(
      `Testing CalDAV connection to: ${serverUrl}`,
      { path: path || "none", username },
      LOG_SOURCE
    );

    const results: TestResult = {
      steps: [],
      success: false,
      error: null,
      details: null,
    };

    try {
      // Step 1: Create client
      results.steps.push({ step: "Creating DAVClient", status: "pending" });
      const client = new DAVClient({
        serverUrl,
        credentials: {
          username,
          password,
        },
        authMethod: "Basic" as const,
        defaultAccountType: "caldav" as const,
      });
      results.steps[0].status = "success";

      // Step 2: Login
      results.steps.push({ step: "Logging in to server", status: "pending" });
      try {
        await client.login();
        results.steps[1].status = "success";

        // Ensure client account has necessary properties after login
        if (client.account && !client.account.homeUrl) {
          // Set homeUrl if not discovered during login (common with Fastmail)
          // Ensure we have an absolute URL
          const defaultPath = `/dav/calendars/user/${encodeURIComponent(
            username
          )}/`;

          // Construct and validate the homeUrl
          let homeUrl;
          try {
            homeUrl = path
              ? formatAbsoluteUrl(serverUrl, path)
              : formatAbsoluteUrl(serverUrl, defaultPath);

            // Validate URL by constructing it
            new URL(homeUrl);

            client.account.homeUrl = homeUrl;
            logger.info(
              "Setting homeUrl manually after login",
              { homeUrl },
              LOG_SOURCE
            );
          } catch (urlError: unknown) {
            const errorMessage =
              urlError instanceof Error ? urlError.message : String(urlError);
            logger.warn(
              "Failed to set homeUrl after login",
              { error: errorMessage },
              LOG_SOURCE
            );
            // Don't throw here, as we'll try again in fetchCalendars
          }
        } else if (client.account && client.account.homeUrl) {
          // Log the discovered homeUrl
          logger.info(
            "HomeUrl discovered during login",
            { homeUrl: client.account.homeUrl },
            LOG_SOURCE
          );

          // Validate the discovered homeUrl
          try {
            new URL(client.account.homeUrl);
          } catch (urlError: unknown) {
            const errorMessage =
              urlError instanceof Error ? urlError.message : String(urlError);
            logger.warn(
              "Discovered homeUrl is invalid",
              { homeUrl: client.account.homeUrl, error: errorMessage },
              LOG_SOURCE
            );

            // Try to fix the homeUrl
            const defaultPath = `/dav/calendars/user/${encodeURIComponent(
              username
            )}/`;
            try {
              const fixedHomeUrl = formatAbsoluteUrl(serverUrl, defaultPath);
              new URL(fixedHomeUrl);
              client.account.homeUrl = fixedHomeUrl;
              logger.info(
                "Fixed invalid homeUrl",
                { originalHomeUrl: client.account.homeUrl, fixedHomeUrl },
                LOG_SOURCE
              );
            } catch (fixError: unknown) {
              const errorMessage =
                fixError instanceof Error ? fixError.message : String(fixError);
              logger.error(
                "Failed to fix invalid homeUrl",
                { error: errorMessage },
                LOG_SOURCE
              );
            }
          }
        }
      } catch (loginError) {
        results.steps[1].status = "failed";
        results.steps[1].error =
          loginError instanceof Error ? loginError.message : String(loginError);
        throw loginError;
      }

      // Step 3: Test path if provided
      if (path) {
        results.steps.push({
          step: `Testing path: ${path}`,
          status: "pending",
        });
        try {
          // Construct and validate the homeUrl
          let homeUrl;
          try {
            homeUrl = formatAbsoluteUrl(
              serverUrl,
              path || `/dav/calendars/user/${encodeURIComponent(username)}/`
            );
            // Validate URL by constructing it
            new URL(homeUrl);
            logger.info(
              "Using homeUrl for fetchCalendars",
              { homeUrl },
              LOG_SOURCE
            );
          } catch (urlError: unknown) {
            const errorMessage =
              urlError instanceof Error ? urlError.message : String(urlError);
            throw new Error(`Invalid URL constructed: ${errorMessage}`);
          }

          const fetchCalendarsOptions = {
            account: {
              serverUrl,
              rootUrl: path,
              accountType: "caldav" as const,
              homeUrl,
            },
          };

          // Log the options being used for fetchCalendars
          logger.info(
            "Fetching calendars with options",
            {
              options: JSON.stringify(fetchCalendarsOptions),
              clientAccount: client.account
                ? JSON.stringify(client.account)
                : "none",
            },
            LOG_SOURCE
          );

          // Try two approaches:
          // 1. Use the client's account if it's already set up
          // 2. Use our custom options if needed
          let calendars;
          try {
            if (client.account && client.account.homeUrl) {
              logger.info(
                "Using client's existing account for fetchCalendars",
                { account: JSON.stringify(client.account) },
                LOG_SOURCE
              );
              calendars = await client.fetchCalendars();
            } else {
              calendars = await client.fetchCalendars(fetchCalendarsOptions);
            }
          } catch (fetchError: unknown) {
            const errorMessage =
              fetchError instanceof Error
                ? fetchError.message
                : String(fetchError);
            logger.error(
              "Error fetching calendars with primary approach",
              { error: errorMessage },
              LOG_SOURCE
            );

            // Try the alternative approach if the first one failed
            if (
              client.account &&
              client.account.homeUrl &&
              !fetchCalendarsOptions.account.homeUrl.includes(
                client.account.homeUrl
              )
            ) {
              logger.info(
                "Trying alternative approach with client's homeUrl",
                { homeUrl: client.account.homeUrl },
                LOG_SOURCE
              );
              calendars = await client.fetchCalendars();
            } else {
              // If both approaches would be the same or we don't have a client account, rethrow
              throw fetchError;
            }
          }

          results.steps[2].status = "success";
          results.steps[2].calendars = calendars.length;
          results.steps[2].calendarNames = calendars.map((c) =>
            typeof c.displayName === "string" ? c.displayName : "Unnamed"
          );
        } catch (pathError) {
          results.steps[2].status = "failed";
          results.steps[2].error =
            pathError instanceof Error ? pathError.message : String(pathError);
          throw pathError;
        }
      } else {
        // If no path provided, try with the default Fastmail path structure
        results.steps.push({
          step: `Testing with default path structure`,
          status: "pending",
        });
        try {
          const defaultPath = `/dav/calendars/user/${encodeURIComponent(
            username
          )}/`;

          // Construct and validate the homeUrl
          let homeUrl;
          try {
            homeUrl = formatAbsoluteUrl(serverUrl, defaultPath);
            // Validate URL by constructing it
            new URL(homeUrl);
            logger.info(
              "Using default homeUrl for fetchCalendars",
              { homeUrl },
              LOG_SOURCE
            );
          } catch (urlError: unknown) {
            const errorMessage =
              urlError instanceof Error ? urlError.message : String(urlError);
            throw new Error(
              `Invalid URL constructed for default path: ${errorMessage}`
            );
          }

          // Log the options being used for fetchCalendars with default path
          const defaultFetchOptions = {
            account: {
              serverUrl,
              rootUrl: defaultPath,
              accountType: "caldav" as const,
              homeUrl,
            },
          };

          logger.info(
            "Fetching calendars with default options",
            {
              options: JSON.stringify(defaultFetchOptions),
              clientAccount: client.account
                ? JSON.stringify(client.account)
                : "none",
            },
            LOG_SOURCE
          );

          // Try two approaches for default path as well
          let calendars;
          try {
            if (
              client.account &&
              client.account.homeUrl &&
              client.account.homeUrl.includes(defaultPath)
            ) {
              logger.info(
                "Using client's existing account for default path",
                { account: JSON.stringify(client.account) },
                LOG_SOURCE
              );
              calendars = await client.fetchCalendars();
            } else {
              calendars = await client.fetchCalendars(defaultFetchOptions);
            }
          } catch (fetchError: unknown) {
            const errorMessage =
              fetchError instanceof Error
                ? fetchError.message
                : String(fetchError);
            logger.error(
              "Error fetching calendars with default path",
              { error: errorMessage },
              LOG_SOURCE
            );
            throw fetchError;
          }

          results.steps[2].status = "success";
          results.steps[2].calendars = calendars.length;
          results.steps[2].calendarNames = calendars.map((c) =>
            typeof c.displayName === "string" ? c.displayName : "Unnamed"
          );
        } catch (pathError) {
          results.steps[2].status = "failed";
          results.steps[2].error =
            pathError instanceof Error ? pathError.message : String(pathError);
          // Don't throw here, as this is just an additional test
          logger.warn(
            "Failed to fetch calendars with default path structure",
            { error: results.steps[2].error },
            LOG_SOURCE
          );
        }
      }

      results.success = true;
    } catch (error) {
      results.success = false;
      results.error = error instanceof Error ? error.message : String(error);
      results.details = error instanceof Error ? error.stack || null : null;

      logger.error(
        "CalDAV test failed",
        {
          error: results.error,
          stack: results.details,
          serverUrl,
          username,
        },
        LOG_SOURCE
      );
    }

    return NextResponse.json(results);
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
        error: "Failed to run CalDAV test",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
