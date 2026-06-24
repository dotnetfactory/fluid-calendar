const DEFAULT_FETCH_ERROR = "Failed to load available calendars";

/**
 * Extracts a user-facing error message from a non-OK calendar response,
 * preferring the server's classified `error` field (e.g. the CalDAV
 * connection-vs-auth message) and falling back to `fallback` when the body is
 * missing, empty, or not JSON.
 */
export async function extractCalendarFetchError(
  response: Response,
  fallback: string = DEFAULT_FETCH_ERROR
): Promise<string> {
  try {
    const data = (await response.json()) as { error?: unknown };
    if (typeof data?.error === "string" && data.error.trim().length > 0) {
      return data.error;
    }
  } catch {
    // Body was not JSON; fall through to the fallback message.
  }
  return fallback;
}
