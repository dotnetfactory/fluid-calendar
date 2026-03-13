/**
 * RecurrenceConverter
 *
 * Base class for converting between provider-specific recurrence formats
 * and the RRule format used by our application.
 */
export class RecurrenceConverter {
  /**
   * Convert from RRule format to provider-specific format
   *
   * @param rrule The recurrence rule in RRule format
   * @returns Provider-specific recurrence format
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  convertFromRRule(rrule: string): unknown {
    throw new Error(
      "convertFromRRule must be implemented by provider-specific converters"
    );
  }

  /**
   * Convert from provider-specific format to RRule format
   *
   * @param recurrence Provider-specific recurrence format
   * @returns RRule format string
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  convertToRRule(recurrence: unknown): string {
    throw new Error(
      "convertToRRule must be implemented by provider-specific converters"
    );
  }

  /**
   * Convert from RRule string to standard RRule format
   * This is useful when receiving RRule strings from external sources that might use non-standard formats
   *
   * @param rruleString The RRule string to convert
   * @returns Standard RRule format string
   */
  convertFromString(rruleString: string): string {
    // Base implementation just returns the string as-is
    // Provider-specific converters should override this if they need special handling
    return rruleString;
  }

  /**
   * Parse a RRule string into its components
   *
   * @param rrule RRule string (can include DTSTART and RRULE parts)
   * @returns Object with parsed components
   */
  parseRRule(rrule: string): Record<string, string | string[]> {
    const result: Record<string, string | string[]> = {};

    // Split into lines in case there's a DTSTART
    const lines = rrule.split("\n");

    for (const line of lines) {
      if (line.startsWith("DTSTART:")) {
        result["DTSTART"] = line.substring(8);
        continue;
      }

      if (line.startsWith("RRULE:")) {
        const ruleText = line.substring(6);
        const parts = ruleText.split(";");

        for (const part of parts) {
          const [key, value] = part.split("=");
          if (!key || !value) continue;

          // Handle arrays (like BYDAY=MO,TU,WE)
          if (value.includes(",")) {
            result[key] = value.split(",");
          } else {
            result[key] = value;
          }
        }
      }
    }

    return result;
  }

  /**
   * Build a RRule string from components
   *
   * @param parts Object with RRule components
   * @returns Formatted RRule string
   */
  buildRRule(parts: Record<string, string | string[] | number>): string {
    const ruleComponents: string[] = [];

    // Convert each part to string format
    for (const [key, value] of Object.entries(parts)) {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          ruleComponents.push(`${key}=${value.join(",")}`);
        } else {
          ruleComponents.push(`${key}=${value}`);
        }
      }
    }

    // Format as RRule
    return `RRULE:${ruleComponents.join(";")}`;
  }
}
