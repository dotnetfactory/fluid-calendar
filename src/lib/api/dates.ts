import { ApiHttpError } from "@/lib/api/v1";

/**
 * Strict RFC 3339 date parsing for the public API.
 *
 * `new Date(str)` is permissive and engine-dependent (it will happily accept
 * "tomorrow", "06/24/2026", or silently produce Invalid Date), which is a
 * footgun for a calendar API with a history of timezone bugs. We instead
 * require a well-formed RFC 3339 value — either a full date-time with an
 * explicit offset (`2026-06-24T15:00:00Z` / `…+02:00`) or a calendar date
 * (`2026-06-24`, interpreted as UTC midnight) — and reject anything else with a
 * clear 400.
 */

const DATE_TIME =
  /^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Parse a required RFC 3339 date/date-time, or throw INVALID_ARGUMENT. */
export function parseApiDate(value: unknown, field: string): Date {
  if (
    typeof value !== "string" ||
    (!DATE_TIME.test(value) && !DATE_ONLY.test(value))
  ) {
    throw new ApiHttpError(
      "INVALID_ARGUMENT",
      `${field} must be an RFC 3339 date or date-time (e.g. 2026-06-24T15:00:00Z)`,
      { field }
    );
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new ApiHttpError("INVALID_ARGUMENT", `${field} is not a valid date`, {
      field,
    });
  }
  return date;
}

/** Parse an optional date — returns null for null/undefined/empty. */
export function parseOptionalApiDate(
  value: unknown,
  field: string
): Date | null {
  if (value === undefined || value === null || value === "") return null;
  return parseApiDate(value, field);
}
