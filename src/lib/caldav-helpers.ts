import { CalendarEvent } from "@prisma/client";
import ICAL from "ical.js";

import { ICalRRule } from "./caldav-interfaces";
import { newDate } from "./date-utils";
import { logger } from "./logger";

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

    // Handle nested parts structure from ICAL.js
    if (rrule.parts && typeof rrule.parts === "object") {
      const partsObj = rrule.parts as Record<string, unknown>;

      // Add bymonth if present
      if (partsObj.BYMONTH) {
        parts.push(
          `BYMONTH=${
            Array.isArray(partsObj.BYMONTH)
              ? partsObj.BYMONTH.join(",")
              : partsObj.BYMONTH
          }`
        );
      }

      // Add bymonthday if present
      if (partsObj.BYMONTHDAY) {
        parts.push(
          `BYMONTHDAY=${
            Array.isArray(partsObj.BYMONTHDAY)
              ? partsObj.BYMONTHDAY.join(",")
              : partsObj.BYMONTHDAY
          }`
        );
      }

      // Add byday if present
      if (partsObj.BYDAY) {
        parts.push(
          `BYDAY=${
            Array.isArray(partsObj.BYDAY)
              ? partsObj.BYDAY.join(",")
              : partsObj.BYDAY
          }`
        );
      }

      // Add byweekno if present
      if (partsObj.BYWEEKNO) {
        parts.push(
          `BYWEEKNO=${
            Array.isArray(partsObj.BYWEEKNO)
              ? partsObj.BYWEEKNO.join(",")
              : partsObj.BYWEEKNO
          }`
        );
      }

      // Add byyearday if present
      if (partsObj.BYYEARDAY) {
        parts.push(
          `BYYEARDAY=${
            Array.isArray(partsObj.BYYEARDAY)
              ? partsObj.BYYEARDAY.join(",")
              : partsObj.BYYEARDAY
          }`
        );
      }

      // Add bysetpos if present
      if (partsObj.BYSETPOS) {
        parts.push(
          `BYSETPOS=${
            Array.isArray(partsObj.BYSETPOS)
              ? partsObj.BYSETPOS.join(",")
              : partsObj.BYSETPOS
          }`
        );
      }
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

/**
 * Converts a VEVENT component to a CalendarEvent
 * @param vevent VEVENT component
 * @param vcalendar Parent VCALENDAR component
 * @returns Converted calendar event
 */
export function convertVEventToCalendarEvent(
  vevent: ICAL.Component
): CalendarEvent {
  try {
    // Extract event properties
    const uidValue = vevent.getFirstPropertyValue("uid");
    const uid = uidValue ? String(uidValue) : crypto.randomUUID();
    const summary = vevent.getFirstPropertyValue("summary");
    const description = vevent.getFirstPropertyValue("description");
    const location = vevent.getFirstPropertyValue("location");

    // Get start and end times
    const dtstart = vevent.getFirstProperty("dtstart");
    const dtend =
      vevent.getFirstProperty("dtend") || vevent.getFirstProperty("duration");

    if (!dtstart) {
      throw new Error("Event is missing start time");
    }

    // Use the helper function to check if this is an all-day event
    const isAllDay = isAllDayEvent(vevent);

    // Convert to JavaScript Date objects
    const dtstartValue = dtstart.getFirstValue();

    // Handle ICAL.js types properly by using type assertion
    // ICAL.Time objects have toJSDate() but TypeScript doesn't know this
    const startDate =
      typeof dtstartValue === "object" && dtstartValue !== null
        ? (dtstartValue as unknown as { toJSDate(): Date }).toJSDate()
        : new Date();

    let endDate: Date;

    if (dtend) {
      const dtendValue = dtend.getFirstValue();

      // Check if it's a duration instead of a date
      if (dtend.name === "duration") {
        // If it's a duration, calculate end time by adding duration to start time
        const duration = dtendValue;
        // Create a new date object to avoid modifying the original
        endDate = new Date(startDate.getTime());

        // If duration has toSeconds method (ICAL.Duration), use it
        if (
          typeof duration === "object" &&
          duration !== null &&
          "toSeconds" in duration
        ) {
          endDate = new Date(startDate.getTime() + duration.toSeconds() * 1000);
        } else if (typeof duration === "string") {
          // Try to parse ISO duration format (e.g., PT1H30M)
          const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
          if (match) {
            const hours = parseInt(match[1] || "0", 10);
            const minutes = parseInt(match[2] || "0", 10);
            const seconds = parseInt(match[3] || "0", 10);
            const durationMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
            endDate = new Date(startDate.getTime() + durationMs);
          } else {
            // Default to 1 hour if we can't parse
            endDate = new Date(startDate.getTime() + 3600000);
          }
        } else {
          // Default to 1 hour if we can't determine duration
          endDate = new Date(startDate.getTime() + 3600000);
        }
      } else {
        // Handle regular end date/time
        if (typeof dtendValue === "object" && dtendValue !== null) {
          // Check if it has toJSDate method
          if (
            "toJSDate" in dtendValue &&
            typeof dtendValue.toJSDate === "function"
          ) {
            endDate = dtendValue.toJSDate();
          } else {
            // Try to convert to date if it has a toString method
            try {
              const dateStr = dtendValue.toString();
              const parsedDate = new Date(dateStr);
              endDate = isNaN(parsedDate.getTime())
                ? new Date(startDate.getTime() + 3600000) // Default to 1 hour later if invalid
                : parsedDate;
            } catch {
              // Default to 1 hour after start if conversion fails
              endDate = new Date(startDate.getTime() + 3600000);
            }
          }
        } else if (typeof dtendValue === "string") {
          // Try to parse string date
          try {
            const parsedDate = new Date(dtendValue);
            endDate = isNaN(parsedDate.getTime())
              ? new Date(startDate.getTime() + 3600000) // Default to 1 hour later if invalid
              : parsedDate;
          } catch {
            // Default to 1 hour after start if parsing fails
            endDate = new Date(startDate.getTime() + 3600000);
          }
        } else {
          // Default to 1 hour after start for unknown types
          endDate = new Date(startDate.getTime() + 3600000);
        }
      }
    } else {
      // If no end time or duration, default to 1 hour after start
      endDate = new Date(startDate.getTime() + 3600000);
    }

    // Check for recurrence
    const rrule = vevent.getFirstPropertyValue("rrule");
    const isRecurring = !!rrule;

    // Get recurrence-id if this is an exception
    const recurrenceId = vevent.getFirstPropertyValue("recurrence-id");
    const isInstance = !!recurrenceId;

    // Only master events should be marked as recurring
    const isMaster = isRecurring && !isInstance;

    // Convert iCalendar recurrence rule to RRule string format if present
    const recurrenceRuleString = isRecurring
      ? convertICalRRuleToRRuleString(rrule as unknown as ICalRRule)
      : null;

    // Create a partial CalendarEvent object
    return {
      id: uid,
      feedId: "", // This would need to be set when saving to the database
      externalEventId: uid,
      title: summary ? String(summary) : "Untitled Event",
      description: description ? String(description) : null,
      start: startDate,
      end: endDate,
      location: location ? String(location) : null,
      isRecurring: isMaster, // Only master events are recurring
      recurrenceRule: recurrenceRuleString,
      allDay: isAllDay,
      status: null,
      sequence: null,
      created: null,
      lastModified: null,
      organizer: null,
      attendees: null,
      createdAt: newDate(),
      updatedAt: newDate(),
      isMaster: isMaster,
      masterEventId: isInstance ? uid.split("_")[0] : null,
      recurringEventId: isInstance ? uid : null,
    } as CalendarEvent;
  } catch (error) {
    logger.error(
      "Failed to convert VEVENT to CalendarEvent",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    // Return a minimal event as fallback
    return {
      id: crypto.randomUUID(),
      feedId: "",
      title: "Error parsing event",
      start: newDate(),
      end: newDate(),
      createdAt: newDate(),
      updatedAt: newDate(),
      allDay: false,
      isRecurring: false,
      isMaster: false,
    } as CalendarEvent;
  }
}

/**
 * Checks if a VEVENT component represents an all-day event
 * @param vevent VEVENT component to check
 * @returns true if the event is an all-day event
 */
export function isAllDayEvent(vevent: ICAL.Component): boolean {
  try {
    // Get the dtstart property
    const dtstart = vevent.getFirstProperty("dtstart");
    if (!dtstart) return false;

    // Check if the value parameter is "date"
    if (dtstart.getParameter("value") === "date") return true;

    // Check if the jCal type is "date"
    if (dtstart.jCal && dtstart.jCal[2] === "date") return true;

    // Check for a duration of P1D which is common for all-day events
    const duration = vevent.getFirstProperty("duration");
    if (duration) {
      const durationValue = duration.getFirstValue();
      if (typeof durationValue === "string" && durationValue === "P1D") {
        return true;
      }
    }

    return false;
  } catch (error) {
    logger.warn(
      "Error checking if event is all-day",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
    return false;
  }
}
