import { extractCalendarFetchError } from "../available-calendars-error";

/**
 * The available-calendars list must surface the server's classified error
 * (e.g. the CalDAV connection-vs-auth message) instead of a generic empty
 * state, so the fix to the `/available` route actually reaches the user
 * (#122/#117/#115).
 */
describe("extractCalendarFetchError", () => {
  it("returns the server-provided error message from the JSON body", async () => {
    const response = {
      json: async () => ({
        error: "Could not connect to the CalDAV server. Please check the server URL.",
      }),
    } as Response;

    await expect(extractCalendarFetchError(response)).resolves.toBe(
      "Could not connect to the CalDAV server. Please check the server URL."
    );
  });

  it("falls back to a default message when the body has no error field", async () => {
    const response = { json: async () => ({}) } as Response;

    await expect(extractCalendarFetchError(response)).resolves.toBe(
      "Failed to load available calendars"
    );
  });

  it("falls back to a default message when the body is not JSON", async () => {
    const response = {
      json: async () => {
        throw new Error("Unexpected token < in JSON");
      },
    } as unknown as Response;

    await expect(extractCalendarFetchError(response)).resolves.toBe(
      "Failed to load available calendars"
    );
  });
});
