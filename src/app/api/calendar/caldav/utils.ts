import { DAVClient } from "tsdav";

import { logger } from "@/lib/logger";

const LOG_SOURCE = "CalDAVUtils";

/** Whether a CalDAV login failure was a connection or an authentication error. */
export type CalDAVErrorKind = "connection" | "auth";

/** Result of classifying a CalDAV connection/login failure. */
export interface ClassifiedCalDAVError {
  kind: CalDAVErrorKind;
  /** User-facing message to return in the `error` field. */
  message: string;
  /** HTTP status to return. */
  status: number;
  /** Original error text, surfaced in the `details` field. */
  details: string;
}

const CONNECTION_ERROR_MESSAGE =
  "Could not connect to the CalDAV server. Please check the server URL, your " +
  "network/firewall, and (for self-signed certificates) the server's TLS " +
  "certificate.";
const AUTH_ERROR_MESSAGE =
  "Failed to authenticate with CalDAV server. Please check your credentials.";

// Tokens (lower-cased) that identify a network-layer / TLS connection failure
// rather than a credentials rejection. Matched against the error message and
// the `code` of every error in the `cause` chain. Grounded in the shapes Node's
// fetch (undici) and tsdav throw - see issues #117 (self-signed TLS,
// `fetch failed` / `UNABLE_TO_VERIFY_LEAF_SIGNATURE`) and #115.
const CONNECTION_ERROR_TOKENS = [
  "fetch failed",
  "enotfound",
  "econnrefused",
  "econnreset",
  "etimedout",
  "ehostunreach",
  "enetunreach",
  "eai_again",
  "epipe",
  "econnaborted",
  "unable_to_verify_leaf_signature",
  "self_signed_cert_in_chain",
  "self signed certificate",
  "depth_zero_self_signed_cert",
  "cert_has_expired",
  "err_tls_cert_altname_invalid",
  "certificate",
  "getaddrinfo",
  "socket hang up",
  "network",
  "timed out",
  "econn",
  // A malformed/unparseable server URL surfaced by Node's fetch is a "check the
  // server URL" problem, not a credentials problem. Match the fetch-specific
  // signals only - NOT a bare "invalid url", which also appears in our own
  // local path-construction errors (those stay 400 bad-path, see the routes).
  "err_invalid_url",
  "failed to parse url",
];

/**
 * Collects the lower-cased `message` and `code` from an error and every error
 * in its `cause` chain (bounded depth to avoid cycles), so a classifier can
 * inspect both `err.message === "fetch failed"` and a nested
 * `err.cause.code === "ENOTFOUND"`.
 */
function collectErrorSignals(error: unknown): string[] {
  const signals: string[] = [];
  let current: unknown = error;
  for (let depth = 0; current != null && depth < 10; depth++) {
    if (typeof current === "string") {
      signals.push(current.toLowerCase());
      break;
    }
    if (typeof current === "object") {
      const obj = current as { message?: unknown; code?: unknown; cause?: unknown };
      if (typeof obj.message === "string") signals.push(obj.message.toLowerCase());
      if (typeof obj.code === "string") signals.push(obj.code.toLowerCase());
      if (obj.cause === current) break; // guard against self-reference
      current = obj.cause;
      continue;
    }
    break;
  }
  return signals;
}

/**
 * Classifies a CalDAV login/connection failure as either a network/TLS
 * connection error or a genuine authentication error, so the API can return an
 * accurate message and HTTP status instead of always blaming credentials.
 *
 * Unrecognized errors default to `auth` so the response is never less
 * informative than the previous hardcoded credentials/401 behavior.
 */
export function classifyCalDAVError(error: unknown): ClassifiedCalDAVError {
  const details = error instanceof Error ? error.message : String(error);
  const signals = collectErrorSignals(error);
  const isConnectionError = CONNECTION_ERROR_TOKENS.some((token) =>
    signals.some((signal) => signal.includes(token))
  );

  if (isConnectionError) {
    return {
      kind: "connection",
      message: CONNECTION_ERROR_MESSAGE,
      status: 502,
      details,
    };
  }

  return {
    kind: "auth",
    message: AUTH_ERROR_MESSAGE,
    status: 401,
    details,
  };
}

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
