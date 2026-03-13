import { normalizeRecurrenceRule } from "@/lib/utils/normalize-recurrence-rules";

import { RecurrenceConverter } from "./recurrence-converter";
import { OutlookTaskRecurrence } from "./recurrence-types";

/**
 * OutlookRecurrenceConverter
 *
 * Converts between Outlook's recurrence format and RRule format
 */
export class OutlookRecurrenceConverter extends RecurrenceConverter {
  /**
   * Convert from RRule format to Outlook recurrence format
   *
   * @param rrule The recurrence rule in RRule format
   * @returns Outlook recurrence format
   */
  convertFromRRule(rrule: string): OutlookTaskRecurrence {
    // Normalize the recurrence rule to handle non-standard formats
    const normalizedRule = normalizeRecurrenceRule(rrule) || rrule;

    // Parse the RRule string into components
    const parts = this.parseRRule(normalizedRule);

    // Extract frequency and interval
    const freq = parts.FREQ as string;
    const interval = parseInt(parts.INTERVAL as string, 10) || 1;

    // Initialize pattern with basic properties
    const pattern: OutlookTaskRecurrence["pattern"] = {
      type: this.mapFrequencyToOutlook(freq),
      interval,
    };

    // Handle day of week for weekly patterns only
    if (freq === "WEEKLY" && parts.BYDAY) {
      // Handle both array and string formats
      const byDays = Array.isArray(parts.BYDAY)
        ? parts.BYDAY
        : [parts.BYDAY as string];

      pattern.daysOfWeek = byDays.map((day) => this.getOutlookDayOfWeek(day));
    }

    // Handle day of month for monthly patterns
    if (freq === "MONTHLY" && parts.BYMONTHDAY) {
      pattern.dayOfMonth = parseInt(
        Array.isArray(parts.BYMONTHDAY)
          ? parts.BYMONTHDAY[0]
          : (parts.BYMONTHDAY as string),
        10
      );
    }

    // Handle month and day for yearly patterns
    if (freq === "YEARLY") {
      if (parts.BYMONTH) {
        pattern.month = parseInt(
          Array.isArray(parts.BYMONTH)
            ? parts.BYMONTH[0]
            : (parts.BYMONTH as string),
          10
        );
      }
      if (parts.BYMONTHDAY) {
        pattern.dayOfMonth = parseInt(
          Array.isArray(parts.BYMONTHDAY)
            ? parts.BYMONTHDAY[0]
            : (parts.BYMONTHDAY as string),
          10
        );
      }
    }

    // Initialize range with startDate
    // If DTSTART is not provided, use the current date
    let startDate: string;
    if (parts.DTSTART) {
      startDate = this.formatOutlookDate(parts.DTSTART as string);
    } else {
      // Use current date in YYYY-MM-DD format
      const today = new Date();
      startDate = today.toISOString().split("T")[0];
    }

    const range: OutlookTaskRecurrence["range"] = {
      type: "noEnd",
      startDate: startDate,
    };

    // Set end condition
    if (parts.COUNT) {
      range.type = "numbered";
      range.numberOfOccurrences = parseInt(parts.COUNT as string, 10);
    } else if (parts.UNTIL) {
      range.type = "endDate";
      range.endDate = this.formatOutlookDate(parts.UNTIL as string);
    }

    return { pattern, range };
  }

  /**
   * Convert from Outlook recurrence format to RRule format
   *
   * @param recurrence Outlook recurrence format
   * @returns RRule format string
   */
  convertToRRule(recurrence: OutlookTaskRecurrence): string {
    // Convert Outlook's relativemonthly to standard monthly with BYDAY
    let freq = recurrence.pattern.type.toUpperCase();
    if (freq === "RELATIVEMONTHLY") {
      freq = "MONTHLY";
    }

    // Initialize RRule parts
    const parts: Record<string, string | string[] | number> = {
      FREQ: freq,
      INTERVAL: recurrence.pattern.interval,
    };

    // Add BYDAY for weekly recurrence or relativemonthly
    if (
      recurrence.pattern.daysOfWeek &&
      recurrence.pattern.daysOfWeek.length > 0
    ) {
      // For relativemonthly, we need to add the week index (e.g., -1 for last, 1 for first)
      if (
        recurrence.pattern.type === "relativemonthly" &&
        recurrence.pattern.index
      ) {
        const weekIndex = this.getWeekdayPositionNumber(
          recurrence.pattern.index
        );

        const days = recurrence.pattern.daysOfWeek.map(
          (day) => `${weekIndex}${this.getRRuleDay(day)}`
        );
        parts.BYDAY = days;
      } else {
        // Regular weekly recurrence
        parts.BYDAY = recurrence.pattern.daysOfWeek.map((day) =>
          this.getRRuleDay(day)
        );
      }
    }

    // Add BYMONTHDAY for monthly recurrence
    if (recurrence.pattern.dayOfMonth) {
      parts.BYMONTHDAY = recurrence.pattern.dayOfMonth;
    }

    // Add BYMONTH for yearly recurrence
    if (recurrence.pattern.month) {
      parts.BYMONTH = recurrence.pattern.month;
    }

    // Handle range properties if range exists
    if (recurrence.range) {
      // Add COUNT or UNTIL for end date
      if (
        recurrence.range.type === "numbered" &&
        recurrence.range.numberOfOccurrences
      ) {
        parts.COUNT = recurrence.range.numberOfOccurrences;
      } else if (
        recurrence.range.type === "endDate" &&
        recurrence.range.endDate
      ) {
        // Convert the date to YYYYMMDD format without hyphens
        const untilDate = recurrence.range.endDate.replace(/-/g, "");
        parts.UNTIL = `${untilDate}T235959Z`;
      }

      // Add DTSTART
      if (recurrence.range.startDate) {
        const dtstart = recurrence.range.startDate.replace(/-/g, "");
        parts.DTSTART = `${dtstart}T000000Z`;
      }
    }

    // Build and return the RRule string
    return this.buildRRule(parts);
  }

  /**
   * Map RRule frequency to Outlook recurrence pattern type
   * Note: Our system only supports basic monthly and yearly patterns
   */
  private mapFrequencyToOutlook(freq: string): string {
    switch (freq.toUpperCase()) {
      case "DAILY":
        return "daily";
      case "WEEKLY":
        return "weekly";
      case "MONTHLY":
        return "absoluteMonthly"; // Default to absolute monthly pattern
      case "ABSOLUTEMONTHLY":
        return "absoluteMonthly"; // Handle non-standard but internally used frequency
      case "YEARLY":
        return "absoluteYearly"; // Default to absolute yearly pattern
      default:
        throw new Error(`Unsupported frequency: ${freq}`);
    }
  }

  /**
   * Get Outlook day of week from RRule day code
   */
  private getOutlookDayOfWeek(rruleDay: string): string {
    const dayMap: Record<string, string> = {
      SU: "sunday",
      MO: "monday",
      TU: "tuesday",
      WE: "wednesday",
      TH: "thursday",
      FR: "friday",
      SA: "saturday",
    };

    return dayMap[rruleDay] || "monday";
  }

  /**
   * Get RRule day code from Outlook day of week
   */
  private getRRuleDay(outlookDay: string): string {
    const dayMap: Record<string, string> = {
      sunday: "SU",
      monday: "MO",
      tuesday: "TU",
      wednesday: "WE",
      thursday: "TH",
      friday: "FR",
      saturday: "SA",
    };

    return dayMap[outlookDay.toLowerCase()] || "MO";
  }

  /**
   * Get Outlook weekday position text from number
   */
  private getWeekdayPosition(position: number): string {
    if (position === -1) return "last";
    if (position === 1) return "first";
    if (position === 2) return "second";
    if (position === 3) return "third";
    if (position === 4) return "fourth";
    return "first";
  }

  /**
   * Get weekday position number from Outlook text
   */
  private getWeekdayPositionNumber(position: string): number {
    const posMap: Record<string, number> = {
      first: 1,
      second: 2,
      third: 3,
      fourth: 4,
      last: -1,
    };

    return posMap[position.toLowerCase()] || 1;
  }

  /**
   * Format date for Outlook (YYYYMMDD -> YYYY-MM-DD)
   */
  private formatOutlookDate(dateStr: string): string {
    // Handle date+time format by extracting just the date part
    if (dateStr.includes("T")) {
      dateStr = dateStr.split("T")[0];
    }

    // If already formatted with hyphens, return as is
    if (dateStr.includes("-")) {
      return dateStr;
    }

    // Format YYYYMMDD -> YYYY-MM-DD
    if (dateStr.length === 8) {
      return `${dateStr.substring(0, 4)}-${dateStr.substring(
        4,
        6
      )}-${dateStr.substring(6, 8)}`;
    }

    return dateStr;
  }
}
