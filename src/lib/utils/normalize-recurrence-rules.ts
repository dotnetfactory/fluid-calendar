/**
 * Normalizes recurrence rules, transforming non-standard formats to standard iCalendar formats
 * Main transformations:
 * - ABSOLUTEMONTHLY -> MONTHLY
 * - Remove RRULE: prefix if present
 */
export function normalizeRecurrenceRule(
  rule: string | null | undefined
): string | null | undefined {
  if (!rule) return rule;

  let normalized = rule;

  // Remove RRULE: prefix if present
  if (normalized.startsWith("RRULE:")) {
    normalized = normalized.substring(6);
  }

  // Replace non-standard ABSOLUTEMONTHLY with standard MONTHLY
  if (normalized.includes("FREQ=ABSOLUTEMONTHLY")) {
    normalized = normalized.replace("FREQ=ABSOLUTEMONTHLY", "FREQ=MONTHLY");
  }

  return normalized;
}
