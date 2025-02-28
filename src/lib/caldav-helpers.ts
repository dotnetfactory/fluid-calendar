import { ICalRRule } from "./caldav-interfaces";
import { logger } from "./logger";
import ICAL from "ical.js";

const LOG_SOURCE = "CalDAVHelpers";


/**
 * Converts an iCalendar recurrence rule object to RRule string format
 * @param rrule The iCalendar recurrence rule object
 * @returns RRule string in the format "FREQ=DAILY;INTERVAL=1"
 */
export function convertICalRRuleToRRuleString(
  rrule:
    | ICalRRule
    | Record<string, unknown>
    | { freq?: string; [key: string]: unknown }
): string {
  if (!rrule) return "";

  try {
    // Start building the RRule string
    const parts: string[] = [];

    // Add frequency (required)
    if (rrule.freq) {
      parts.push(`FREQ=${rrule.freq}`);
    } else {
      // If no frequency, we can't create a valid RRule
      logger.warn(
        "Missing frequency in recurrence rule",
        {
          rrule:
            typeof rrule === "object" ? JSON.stringify(rrule) : String(rrule),
        },
        LOG_SOURCE
      );
      return "";
    }

    // Add interval if present
    if (
      rrule.interval &&
      typeof rrule.interval === "number" &&
      rrule.interval > 1
    ) {
      parts.push(`INTERVAL=${rrule.interval}`);
    }

    // Add count if present
    if (rrule.count) {
      parts.push(`COUNT=${rrule.count}`);
    }

    // Add until if present
    if (rrule.until) {
      // Format until date as YYYYMMDD
      let untilStr = "";
      if (typeof rrule.until === "string") {
        // Try to parse the date string
        const untilDate = new Date(rrule.until);
        if (!isNaN(untilDate.getTime())) {
          untilStr =
            untilDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
        }
      } else if (rrule.until instanceof Date) {
        untilStr =
          rrule.until.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      } else if (
        typeof rrule.until === "object" &&
        rrule.until !== null &&
        "toJSDate" in rrule.until
      ) {
        // Handle ICAL.Time objects
        const untilDate = (rrule.until as ICAL.Time).toJSDate();
        untilStr =
          untilDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      }

      if (untilStr) {
        parts.push(`UNTIL=${untilStr}`);
      }
    }

    // Add bymonth if present
    if (rrule.bymonth) {
      parts.push(
        `BYMONTH=${
          Array.isArray(rrule.bymonth) ? rrule.bymonth.join(",") : rrule.bymonth
        }`
      );
    }

    // Add bymonthday if present
    if (rrule.bymonthday) {
      parts.push(
        `BYMONTHDAY=${
          Array.isArray(rrule.bymonthday)
            ? rrule.bymonthday.join(",")
            : rrule.bymonthday
        }`
      );
    }

    // Add byday if present
    if (rrule.byday) {
      parts.push(
        `BYDAY=${
          Array.isArray(rrule.byday) ? rrule.byday.join(",") : rrule.byday
        }`
      );
    }

    // Add byweekno if present
    if (rrule.byweekno) {
      parts.push(
        `BYWEEKNO=${
          Array.isArray(rrule.byweekno)
            ? rrule.byweekno.join(",")
            : rrule.byweekno
        }`
      );
    }

    // Add byyearday if present
    if (rrule.byyearday) {
      parts.push(
        `BYYEARDAY=${
          Array.isArray(rrule.byyearday)
            ? rrule.byyearday.join(",")
            : rrule.byyearday
        }`
      );
    }

    // Add bysetpos if present
    if (rrule.bysetpos) {
      parts.push(
        `BYSETPOS=${
          Array.isArray(rrule.bysetpos)
            ? rrule.bysetpos.join(",")
            : rrule.bysetpos
        }`
      );
    }

    // Add wkst if present
    if (rrule.wkst) {
      parts.push(`WKST=${rrule.wkst}`);
    }

    // Join all parts with semicolons
    const result = parts.join(";");

    return result;
  } catch (error) {
    logger.error(
      "Failed to convert iCalendar recurrence rule to RRule string",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        rrule:
          typeof rrule === "object" ? JSON.stringify(rrule) : String(rrule),
      },
      LOG_SOURCE
    );
    return "";
  }
}

/**
 * Converts an RRule string to an iCalendar recurrence rule object
 * This is useful when we need to convert from the database format back to the format used by ICAL.js
 * @param rruleString The RRule string in the format "FREQ=DAILY;INTERVAL=1"
 * @returns An object that can be used with ICAL.js
 *
 * @note This function is currently not used but is kept for future implementation
 * when we need to convert RRule strings back to iCalendar objects.
 */
export function convertRRuleStringToICalRRule(
  rruleString: string
): ICalRRule | null {
  if (!rruleString) return null;

  try {
    // Parse the RRule string
    const parts = rruleString.split(";");
    const result: ICalRRule = {};

    for (const part of parts) {
      const [key, value] = part.split("=");
      if (!key || !value) continue;

      const lowerKey = key.toLowerCase();

      // Handle different types of values
      switch (lowerKey) {
        case "freq":
          result.freq = value;
          break;
        case "interval":
          result.interval = parseInt(value, 10);
          break;
        case "count":
          result.count = parseInt(value, 10);
          break;
        case "until":
          // Parse UNTIL date format (YYYYMMDDTHHMMSSZ)
          if (value.length >= 8) {
            const year = parseInt(value.substring(0, 4), 10);
            const month = parseInt(value.substring(4, 6), 10) - 1; // JS months are 0-based
            const day = parseInt(value.substring(6, 8), 10);

            let hour = 0,
              minute = 0,
              second = 0;
            if (value.length >= 15) {
              hour = parseInt(value.substring(9, 11), 10);
              minute = parseInt(value.substring(11, 13), 10);
              second = parseInt(value.substring(13, 15), 10);
            }

            const untilDate = new Date(
              Date.UTC(year, month, day, hour, minute, second)
            );
            result.until = untilDate;
          }
          break;
        case "byday":
          result.byday = value.split(",");
          break;
        case "bymonthday":
          result.bymonthday = value.split(",").map((v) => parseInt(v, 10));
          break;
        case "bymonth":
          result.bymonth = value.split(",").map((v) => parseInt(v, 10));
          break;
        case "byweekno":
          result.byweekno = value.split(",").map((v) => parseInt(v, 10));
          break;
        case "byyearday":
          result.byyearday = value.split(",").map((v) => parseInt(v, 10));
          break;
        case "bysetpos":
          result.bysetpos = value.split(",").map((v) => parseInt(v, 10));
          break;
        case "wkst":
          result.wkst = value;
          break;
        default:
          // Ignore unknown properties
          break;
      }
    }

    return result;
  } catch (error) {
    logger.error(
      "Failed to convert RRule string to iCalendar recurrence rule",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        rruleString,
      },
      LOG_SOURCE
    );
    return null;
  }
}
