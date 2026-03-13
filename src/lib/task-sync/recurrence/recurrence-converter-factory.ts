import { OutlookRecurrenceConverter } from "./outlook-recurrence-converter";
import { RecurrenceConverter } from "./recurrence-converter";

/**
 * RecurrenceConverterFactory
 *
 * Factory class that provides the appropriate recurrence converter
 * based on provider type.
 */
export class RecurrenceConverterFactory {
  /**
   * Get a recurrence converter for the specified provider type
   *
   * @param providerType Type of provider (e.g., "OUTLOOK", "GOOGLE", "CALDAV")
   * @returns Appropriate recurrence converter instance
   */
  static getConverter(providerType: string): RecurrenceConverter {
    switch (providerType.toUpperCase()) {
      case "OUTLOOK":
        return new OutlookRecurrenceConverter();
      // Add more providers as needed

      default:
        // Return base converter as fallback
        return new RecurrenceConverter();
    }
  }
}
