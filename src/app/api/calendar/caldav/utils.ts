import { DAVClient } from "tsdav";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "CalDAVUtils";

/**
 * Helper function to ensure a URL is properly formatted
 * @param baseUrl The base URL (e.g., https://caldav.fastmail.com)
 * @param path The path to append (e.g., /dav/calendars/user/email/)
 * @returns A properly formatted absolute URL
 */
export function formatAbsoluteUrl(baseUrl: string, path?: string): string {
  // If no path, ensure baseUrl is a valid URL
  if (!path) {
    try {
      // Validate that baseUrl is a valid URL
      new URL(baseUrl);
      return baseUrl;
    } catch {
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
    } catch {
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
  } catch {
    // If the URL is invalid, try to fix it
    if (!fullUrl.startsWith("http")) {
      const fixedUrl = `https://${fullUrl}`;
      try {
        new URL(fixedUrl);
        return fixedUrl;
      } catch {
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
 * Creates a DAVClient instance for CalDAV operations
 * @param serverUrl The CalDAV server URL
 * @param username The username for authentication
 * @param password The password for authentication
 * @returns A configured DAVClient instance
 */
export function createCalDAVClient(
  serverUrl: string,
  username: string,
  password: string
) {
  return new DAVClient({
    serverUrl,
    credentials: {
      username,
      password,
    },
    authMethod: "Basic" as const,
    defaultAccountType: "caldav" as const,
  });
}

/**
 * Attempts to login to a CalDAV server
 * @param client The DAVClient instance
 * @param serverUrl The server URL (for logging)
 * @param username The username (for logging)
 * @returns A promise that resolves when login is successful
 */
export async function loginToCalDAVServer(
  client: DAVClient,
  serverUrl: string,
  username: string
) {
  try {
    await client.login();
    logger.info(
      "Successfully logged in to CalDAV server",
      { serverUrl, username },
      LOG_SOURCE
    );
    return true;
  } catch (loginError) {
    logger.error(
      "Failed to login to CalDAV server",
      {
        error:
          loginError instanceof Error ? loginError.message : String(loginError),
        serverUrl,
        username,
      },
      LOG_SOURCE
    );
    throw loginError;
  }
}

/**
 * Handles Fastmail-specific path formatting
 * @param serverUrl The server URL
 * @param path The provided path (if any)
 * @param username The username for Fastmail path construction
 * @returns The appropriate path to use
 */
export function handleFastmailPath(
  serverUrl: string,
  path: string | undefined,
  username: string
): string | undefined {
  if (!path && serverUrl.includes("fastmail.com")) {
    const fastmailPath = `/dav/calendars/user/${encodeURIComponent(username)}/`;
    logger.info(
      "Detected Fastmail server, using default path",
      { fastmailPath },
      LOG_SOURCE
    );
    return fastmailPath;
  }
  return path;
}

/**
 * Fetches calendars from a CalDAV server
 * @param client The DAVClient instance
 * @returns A promise that resolves to the list of calendars
 */
export async function fetchCalDAVCalendars(client: DAVClient) {
  try {
    const calendars = await client.fetchCalendars();
    return calendars;
  } catch (error) {
    logger.error(
      "Failed to fetch CalDAV calendars",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    throw error;
  }
}
