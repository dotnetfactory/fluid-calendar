import { PrismaClient, CalendarEvent, ConnectedAccount } from "@prisma/client";
import { createDAVClient, DAVCalendar, DAVResponse, DAVDepth } from "tsdav";
import ICAL from "ical.js";
import { logger } from "@/lib/logger";
import { newDate, newDateFromYMD } from "@/lib/date-utils";

const LOG_SOURCE = "CalDAVCalendar";

// Define a type for iCalendar recurrence rules
interface ICalRRule {
  freq?: string;
  interval?: number;
  count?: number;
  until?: Date | string | ICAL.Time;
  bymonth?: number | number[];
  bymonthday?: number | number[];
  byday?: string | string[];
  byweekno?: number | number[];
  byyearday?: number | number[];
  bysetpos?: number | number[];
  wkst?: string;
  [key: string]: unknown; // Allow for other properties
}

// Define an extended client type that includes the actual methods used
interface ExtendedDAVClient {
  fetchPrincipalUrl: () => Promise<string>;
  fetchCalendars: () => Promise<DAVCalendar[]>;
  calendarQuery: (params: CalendarQueryParams) => Promise<DAVResponse[]>;
  // Add other methods as needed
}

// Define the structure for calendar query parameters
interface CalendarQueryParams {
  url: string;
  props: Record<string, unknown>;
  filters: {
    "comp-filter": {
      _attributes: {
        name: string;
      };
      "comp-filter": {
        _attributes: {
          name: string;
        };
        "time-range"?: {
          _attributes: {
            start: string;
            end: string;
          };
        };
      };
    };
  };
  depth: string;
}

/**
 * Interface for calendar objects returned by the CalDAV server
 */
interface CalDAVCalendarObject {
  url: string;
  etag: string;
  data: string | { _cdata: string } | Record<string, unknown>; // iCalendar data can be a string or an object with _cdata property
}

/**
 * Interface for calendar discovery results
 */
interface CalDAVCalendarInfo {
  url: string;
  displayName: string;
  description?: string;
  color?: string;
  ctag?: string;
}

/**
 * Interface for sync results
 */
interface SyncResult {
  added: CalendarEvent[];
  updated: CalendarEvent[];
  deleted: string[];
}

/**
 * Input for creating or updating calendar events
 */
interface CalendarEventInput {
  id?: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  allDay?: boolean;
  isRecurring?: boolean;
  recurrenceRule?: string;
}

/**
 * Converts an iCalendar recurrence rule object to RRule string format
 * @param rrule The iCalendar recurrence rule object
 * @returns RRule string in the format "FREQ=DAILY;INTERVAL=1"
 */
function convertICalRRuleToRRuleString(
  rrule:
    | ICalRRule
    | Record<string, unknown>
    | { freq?: string; [key: string]: unknown }
): string {
  if (!rrule) return "";

  try {
    // Log the input for debugging
    logger.debug(
      "Converting iCalendar recurrence rule to RRule string",
      {
        originalRule:
          typeof rrule === "object" ? JSON.stringify(rrule) : String(rrule),
      },
      LOG_SOURCE
    );

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

    // Log the result for debugging
    logger.debug(
      "Converted recurrence rule",
      {
        originalRule:
          typeof rrule === "object" ? JSON.stringify(rrule) : String(rrule),
        convertedRule: result,
      },
      LOG_SOURCE
    );

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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function convertRRuleStringToICalRRule(rruleString: string): ICalRRule | null {
  if (!rruleString) return null;

  try {
    // Log the input for debugging
    logger.debug(
      "Converting RRule string to iCalendar recurrence rule",
      { rruleString },
      LOG_SOURCE
    );

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

    // Log the result for debugging
    logger.debug(
      "Converted to iCalendar recurrence rule",
      { result: JSON.stringify(result) },
      LOG_SOURCE
    );

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
 * Service for interacting with CalDAV servers
 */
export class CalDAVCalendarService {
  private client: ExtendedDAVClient | null = null;

  /**
   * Creates a new CalDAV calendar service
   * @param prisma Prisma client instance
   * @param account Connected account with CalDAV credentials
   */
  constructor(private prisma: PrismaClient, private account: ConnectedAccount) {
    // Initialize client when needed
  }

  /**
   * Creates and initializes the CalDAV client
   * @returns Initialized DAVClient
   */
  private async getClient(): Promise<ExtendedDAVClient> {
    if (this.client) {
      return this.client;
    }

    if (!this.account.caldavUrl) {
      throw new Error("CalDAV URL is required");
    }

    try {
      // Use type assertion to tell TypeScript this is our extended client type
      this.client = (await createDAVClient({
        serverUrl: this.account.caldavUrl,
        credentials: {
          username: this.account.caldavUsername || this.account.email,
          password: this.account.accessToken,
        },
        authMethod: "Basic",
        defaultAccountType: "caldav",
      })) as unknown as ExtendedDAVClient;

      return this.client;
    } catch (error) {
      logger.error(
        "Failed to create CalDAV client",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          accountId: this.account.id,
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Tests the connection to the CalDAV server
   * @returns True if connection is successful
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = await this.getClient();
      if (!client) return false;

      await client.fetchPrincipalUrl();
      return true;
    } catch (error) {
      logger.error(
        "CalDAV connection test failed",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          accountId: this.account.id,
        },
        LOG_SOURCE
      );
      return false;
    }
  }

  /**
   * Discovers available calendars on the CalDAV server
   * @returns Array of discovered calendars
   */
  async discoverCalendars(): Promise<CalDAVCalendarInfo[]> {
    try {
      const client = await this.getClient();
      if (!client) return [];

      const calendars = await client.fetchCalendars();

      return calendars.map((calendar: DAVCalendar) => ({
        url: calendar.url,
        displayName:
          typeof calendar.displayName === "string"
            ? calendar.displayName
            : "Unnamed Calendar",
        description:
          typeof calendar.description === "string"
            ? calendar.description
            : undefined,
        color: calendar.calendarColor,
        ctag: calendar.ctag,
      }));
    } catch (error) {
      logger.error(
        "Failed to discover CalDAV calendars",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          accountId: this.account.id,
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Fetches events from a CalDAV calendar for a specific time range
   * @param start Start date
   * @param end End date
   * @param calendarPath Path to the calendar
   * @returns Array of calendar events
   */
  async getEvents(
    start: Date,
    end: Date,
    calendarPath: string
  ): Promise<CalendarEvent[]> {
    try {
      const client = await this.getClient();
      if (!client) return [];

      // Format dates in the correct format for CalDAV: YYYYMMDDTHHMMSSZ
      const formatDateForCalDAV = (date: Date): string => {
        return date
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d{3}/, "");
      };

      logger.info(
        "Fetching CalDAV events",
        {
          calendarPath,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          formattedStart: formatDateForCalDAV(start),
          formattedEnd: formatDateForCalDAV(end),
        },
        LOG_SOURCE
      );

      // Fetch calendar objects in the specified time range
      const calendarObjects = await client.calendarQuery({
        url: calendarPath,
        props: {
          "calendar-data": {},
        },
        filters: {
          "comp-filter": {
            _attributes: {
              name: "VCALENDAR",
            },
            "comp-filter": {
              _attributes: {
                name: "VEVENT",
              },
              "time-range": {
                _attributes: {
                  start: formatDateForCalDAV(start),
                  end: formatDateForCalDAV(end),
                },
              },
            },
          },
        },
        depth: "1" as DAVDepth,
      });

      // Convert DAVResponse objects to CalDAVCalendarObject format
      const calendarData: CalDAVCalendarObject[] = calendarObjects.map(
        (obj: DAVResponse) => {
          // Get calendar data, which might be in different formats
          const calendarDataProp =
            obj.props?.["calendar-data"] || obj.props?.calendarData || "";

          return {
            url: obj.href || "",
            etag: obj.props?.getetag || "",
            data: calendarDataProp,
          };
        }
      );

      // Log the first calendar object for debugging
      if (calendarData.length > 0) {
        logger.debug(
          "First calendar object",
          {
            url: calendarData[0].url,
            dataType: typeof calendarData[0].data,
            hasData: !!calendarData[0].data,
            hasCData:
              typeof calendarData[0].data === "object" &&
              calendarData[0].data !== null &&
              "_cdata" in (calendarData[0].data as Record<string, unknown>),
          },
          LOG_SOURCE
        );
      }

      // Process each calendar object
      let allEvents: CalendarEvent[] = [];

      for (const calendarObject of calendarData) {
        try {
          // Extract iCalendar data
          let icalData = "";
          if (typeof calendarObject.data === "string") {
            icalData = calendarObject.data;
          } else if (
            typeof calendarObject.data === "object" &&
            calendarObject.data !== null
          ) {
            // Try to get _cdata property if it exists
            const dataObj = calendarObject.data as Record<string, unknown>;
            if ("_cdata" in dataObj && typeof dataObj._cdata === "string") {
              icalData = dataObj._cdata;
            } else {
              // Try to stringify the object as a fallback
              try {
                icalData = JSON.stringify(calendarObject.data);
              } catch (error) {
                logger.warn(
                  "Failed to stringify calendar data",
                  {
                    url: calendarObject.url,
                    error:
                      error instanceof Error ? error.message : "Unknown error",
                  },
                  LOG_SOURCE
                );
                continue; // Skip this object
              }
            }
          }

          if (!icalData) {
            logger.warn(
              "Empty iCalendar data",
              { url: calendarObject.url },
              LOG_SOURCE
            );
            continue; // Skip this object
          }

          // Check if this is a recurring event
          const jcalData = ICAL.parse(icalData);
          const vcalendar = new ICAL.Component(jcalData);
          const hasRecurringEvents = vcalendar
            .getAllSubcomponents("vevent")
            .some((event) => event.hasProperty("rrule"));

          if (hasRecurringEvents) {
            // Expand recurring events
            const expandedEvents = this.expandRecurringEvents(
              icalData,
              start,
              end
            );

            // Set the feed ID for all events
            expandedEvents.forEach((event) => {
              event.feedId = ""; // Will be set when saving to database
            });

            allEvents = allEvents.concat(expandedEvents);
          } else {
            // For non-recurring events, just convert directly
            const event = this.convertFromICalendar(calendarObject);
            allEvents.push(event);
          }
        } catch (error) {
          logger.error(
            "Failed to process calendar object",
            {
              error: error instanceof Error ? error.message : "Unknown error",
              url: calendarObject.url,
            },
            LOG_SOURCE
          );
        }
      }

      logger.info(
        "Processed CalDAV events",
        {
          totalEvents: allEvents.length,
          masterEvents: allEvents.filter((e) => e.isMaster).length,
          instanceEvents: allEvents.filter((e) => !e.isMaster).length,
        },
        LOG_SOURCE
      );

      return allEvents;
    } catch (error) {
      logger.error(
        "Failed to fetch CalDAV events",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          accountId: this.account.id,
          calendarPath,
          start: start.toISOString(),
          end: end.toISOString(),
        },
        LOG_SOURCE
      );
      return [];
    }
  }

  /**
   * Converts a CalDAV calendar object to internal CalendarEvent format
   * @param calendarObject CalDAV calendar object
   * @returns Converted calendar event
   */
  private convertFromICalendar(
    calendarObject: CalDAVCalendarObject
  ): CalendarEvent {
    try {
      // Parse iCalendar data
      // Handle case where data is an object with _cdata property
      let icalData = "";
      if (typeof calendarObject.data === "string") {
        icalData = calendarObject.data;
      } else if (
        typeof calendarObject.data === "object" &&
        calendarObject.data !== null
      ) {
        // Try to get _cdata property if it exists
        const dataObj = calendarObject.data as Record<string, unknown>;
        if ("_cdata" in dataObj && typeof dataObj._cdata === "string") {
          icalData = dataObj._cdata;
        } else {
          // Try to stringify the object as a fallback
          try {
            icalData = JSON.stringify(calendarObject.data);
          } catch (error) {
            logger.warn(
              "Failed to stringify calendar data",
              {
                url: calendarObject.url,
                error: error instanceof Error ? error.message : "Unknown error",
              },
              LOG_SOURCE
            );
          }
        }
      }

      // Log data type for debugging
      logger.debug(
        "Converting iCalendar data",
        {
          url: calendarObject.url,
          dataType: typeof calendarObject.data,
          hasCData:
            typeof calendarObject.data === "object" &&
            "_cdata" in (calendarObject.data || {}),
          dataLength: icalData.length,
        },
        LOG_SOURCE
      );

      const jcalData = ICAL.parse(icalData);
      const vcalendar = new ICAL.Component(jcalData);
      const vevent = vcalendar.getFirstSubcomponent("vevent");

      if (!vevent) {
        throw new Error("No VEVENT component found in iCalendar data");
      }

      // Extract event properties
      const uid = vevent.getFirstPropertyValue("uid");
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

      // Log property types for debugging
      logger.debug(
        "Event property types",
        {
          uid: uid ? String(uid) : null,
          summary: summary ? String(summary) : null,
          hasEndTime: !!dtend,
          endPropertyName: dtend?.name ? String(dtend.name) : null,
          startValueType: typeof dtstart.getFirstValue(),
          endValueType: dtend ? typeof dtend.getFirstValue() : null,
        },
        LOG_SOURCE
      );

      const isAllDay = dtstart.getParameter("value") === "date";

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
            endDate = new Date(
              startDate.getTime() + duration.toSeconds() * 1000
            );
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

      // Convert iCalendar recurrence rule to RRule string format if present
      const recurrenceRuleString = isRecurring
        ? convertICalRRuleToRRuleString(rrule as unknown as ICalRRule)
        : null;

      // Create a partial CalendarEvent object
      // Note: This is incomplete and would need to be properly saved to the database
      return {
        id: uid,
        feedId: "", // This would need to be set when saving to the database
        externalEventId: uid,
        title: summary || "Untitled Event",
        description: description || null,
        start: startDate,
        end: endDate,
        location: location || null,
        isRecurring,
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
        isMaster: isRecurring,
        masterEventId: null,
        recurringEventId: null,
      } as CalendarEvent;
    } catch (error) {
      logger.error(
        "Failed to convert iCalendar to event",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          url: calendarObject.url,
        },
        LOG_SOURCE
      );

      // Return a minimal event as fallback
      return {
        id: calendarObject.url,
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
   * Converts an internal event to iCalendar format
   * @param event Calendar event to convert
   * @returns iCalendar data as string
   */
  private convertToICalendar(event: CalendarEventInput): string {
    // Create a new iCalendar component
    const calendar = new ICAL.Component(["vcalendar", [], []]);
    calendar.updatePropertyWithValue("prodid", "-//Fluid Calendar//EN");
    calendar.updatePropertyWithValue("version", "2.0");

    // Create the event component
    const vevent = new ICAL.Component(["vevent", [], []]);
    vevent.updatePropertyWithValue("uid", event.id || crypto.randomUUID());
    vevent.updatePropertyWithValue("summary", event.title);

    if (event.description) {
      vevent.updatePropertyWithValue("description", event.description);
    }

    if (event.location) {
      vevent.updatePropertyWithValue("location", event.location);
    }

    // Add start and end times
    const dtstart = new ICAL.Property("dtstart");
    const dtend = new ICAL.Property("dtend");

    if (event.allDay) {
      dtstart.setParameter("value", "date");
      dtend.setParameter("value", "date");

      // Format as YYYYMMDD for all-day events
      const formatDate = (date: Date) => {
        return date.toISOString().split("T")[0].replace(/-/g, "");
      };

      dtstart.setValue(formatDate(event.start));
      dtend.setValue(formatDate(event.end));
    } else {
      // Set as date-time with timezone
      const startTime = ICAL.Time.fromJSDate(event.start, false);
      const endTime = ICAL.Time.fromJSDate(event.end, false);

      dtstart.setValue(startTime);
      dtend.setValue(endTime);
    }

    vevent.addProperty(dtstart);
    vevent.addProperty(dtend);

    // Handle recurring events
    if (event.isRecurring && event.recurrenceRule) {
      vevent.updatePropertyWithValue("rrule", event.recurrenceRule);
    }

    // Add the event to the calendar
    calendar.addSubcomponent(vevent);

    // Return the iCalendar string
    return calendar.toString();
  }

  /**
   * Creates a new event in a CalDAV calendar
   * @param calendarPath Path to the calendar
   * @param event Event data to create
   * @returns Created calendar event
   */
  async createEvent(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _calendarPath: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _event: CalendarEventInput
  ): Promise<CalendarEvent> {
    // This will be implemented in Phase 4
    throw new Error("Method not implemented");
  }

  /**
   * Updates an existing event in a CalDAV calendar
   * @param calendarPath Path to the calendar
   * @param eventId ID of the event to update
   * @param event Updated event data
   * @returns Updated calendar event
   */
  async updateEvent(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _calendarPath: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _eventId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _event: CalendarEventInput
  ): Promise<CalendarEvent> {
    // This will be implemented in Phase 4
    throw new Error("Method not implemented");
  }

  /**
   * Deletes an event from a CalDAV calendar
   * @param calendarPath Path to the calendar
   * @param eventId ID of the event to delete
   * @param mode Whether to delete a single instance or the entire series
   */
  async deleteEvent(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _calendarPath: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _eventId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _mode: "single" | "series"
  ): Promise<void> {
    // This will be implemented in Phase 4
    throw new Error("Method not implemented");
  }

  /**
   * Synchronizes a CalDAV calendar with the local database
   * @param calendarPath Path to the calendar
   * @returns Sync result with added, updated, and deleted events
   */
  async syncCalendar(calendarPath: string): Promise<SyncResult> {
    try {
      logger.info(
        "Starting CalDAV calendar sync",
        {
          calendarPath,
          accountId: this.account.id,
        },
        LOG_SOURCE
      );

      // Get the calendar feed from the database
      const feed = await this.prisma.calendarFeed.findFirst({
        where: {
          url: calendarPath,
          accountId: this.account.id,
          type: "CALDAV",
        },
      });

      if (!feed) {
        throw new Error(`Calendar feed not found for path: ${calendarPath}`);
      }

      // Get existing events for this feed
      const existingEvents = await this.prisma.calendarEvent.findMany({
        where: { feedId: feed.id },
        select: {
          id: true,
          externalEventId: true,
          isMaster: true,
          masterEventId: true,
        },
      });

      // Create maps for faster lookups
      const existingEventMap = new Map(
        existingEvents.map((e) => [e.externalEventId, e])
      );

      // We don't need this map since we're using newMasterEventMap instead
      // const existingMasterMap = new Map(
      //   existingEvents.filter((e) => e.isMaster).map((e) => [e.id, e])
      // );

      // Define time range for events (1 year back to 1 year ahead)
      const now = newDate();
      const start = newDateFromYMD(now.getFullYear() - 1, 0, 1); // 1 year ago, January 1st
      const end = newDateFromYMD(now.getFullYear() + 1, 11, 31); // End of next year

      logger.info(
        "Fetching events for sync",
        {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
        LOG_SOURCE
      );

      // Fetch events from CalDAV server
      const events = await this.getEvents(start, end, calendarPath);

      logger.info(
        "Fetched events from CalDAV server",
        {
          count: events.length,
          masterCount: events.filter((e) => e.isMaster).length,
          instanceCount: events.filter((e) => !e.isMaster).length,
          calendarPath,
          accountId: this.account.id,
        },
        LOG_SOURCE
      );

      // Track results
      const added: CalendarEvent[] = [];
      const updated: CalendarEvent[] = [];
      const processedEventIds = new Set<string>();

      // First, process master events to ensure they exist before instances
      const masterEvents = events.filter((e) => e.isMaster);
      const instanceEvents = events.filter((e) => !e.isMaster);

      // Map to track newly created master events
      const newMasterEventMap = new Map<string, string>();

      // Process master events first
      for (const event of masterEvents) {
        try {
          const externalEventId = event.externalEventId || event.id;
          if (externalEventId) {
            processedEventIds.add(externalEventId);
          }

          // Prepare event data for database
          const eventData = {
            feedId: feed.id,
            externalEventId,
            title: event.title || "Untitled Event",
            description: event.description,
            start: event.start,
            end: event.end,
            location: event.location,
            isRecurring: event.isRecurring || false,
            recurrenceRule: event.recurrenceRule,
            allDay: event.allDay || false,
            status: event.status,
            isMaster: true,
            masterEventId: null,
            recurringEventId: null,
          };

          // Check if event already exists
          const existingEvent = existingEventMap.get(externalEventId);

          if (existingEvent) {
            // Update existing event
            const updatedEvent = await this.prisma.calendarEvent.update({
              where: { id: existingEvent.id },
              data: eventData,
            });
            updated.push(updatedEvent);

            // Track this master event ID for instances
            newMasterEventMap.set(externalEventId, updatedEvent.id);
          } else {
            // Create new event
            const newEvent = await this.prisma.calendarEvent.create({
              data: eventData,
            });
            added.push(newEvent);

            // Track this master event ID for instances
            newMasterEventMap.set(externalEventId, newEvent.id);
          }
        } catch (eventError) {
          logger.error(
            "Failed to process CalDAV master event",
            {
              error:
                eventError instanceof Error
                  ? eventError.message
                  : "Unknown error",
              eventId: event.id,
              title: event.title,
            },
            LOG_SOURCE
          );
        }
      }

      // Now process instance events
      for (const event of instanceEvents) {
        try {
          const externalEventId = event.externalEventId || event.id;
          if (externalEventId) {
            processedEventIds.add(externalEventId);
          }

          // Find the master event ID
          let masterEventId = event.masterEventId;

          // If we have a masterEventId that's an externalId, look up the actual DB ID
          if (masterEventId && newMasterEventMap.has(masterEventId)) {
            const newMasterId = newMasterEventMap.get(masterEventId);
            if (newMasterId) {
              masterEventId = newMasterId;
            }
          }

          const masterEvent = masterEvents.find(
            (e) => e.id === event.masterEventId
          );
          // Prepare event data for database
          const eventData = {
            feedId: feed.id,
            externalEventId,
            title: event.title || "Untitled Event",
            description: event.description,
            start: event.start,
            end: event.end,
            location: event.location,
            isRecurring: true, // Instance events are not recurring themselves
            recurrenceRule: masterEvent?.recurrenceRule, // Instance events don't have recurrence rules
            allDay: event.allDay || false,
            status: event.status,
            isMaster: false,
            masterEventId,
            recurringEventId: event.recurringEventId,
          };

          // Check if event already exists
          const existingEvent = existingEventMap.get(externalEventId);

          if (existingEvent) {
            // Update existing event
            const updatedEvent = await this.prisma.calendarEvent.update({
              where: { id: existingEvent.id },
              data: eventData,
            });
            updated.push(updatedEvent);
          } else {
            // Create new event
            const newEvent = await this.prisma.calendarEvent.create({
              data: eventData,
            });
            added.push(newEvent);
          }
        } catch (eventError) {
          logger.error(
            "Failed to process CalDAV instance event",
            {
              error:
                eventError instanceof Error
                  ? eventError.message
                  : "Unknown error",
              eventId: event.id,
              title: event.title,
              masterEventId: event.masterEventId,
            },
            LOG_SOURCE
          );
        }
      }

      // Find events to delete (events in our database that weren't returned by the server)
      const deletedIds: string[] = [];
      for (const [externalEventId, event] of existingEventMap.entries()) {
        if (externalEventId && !processedEventIds.has(externalEventId)) {
          try {
            await this.prisma.calendarEvent.delete({
              where: { id: event.id },
            });
            deletedIds.push(event.id);
          } catch (deleteError) {
            logger.error(
              "Failed to delete CalDAV event",
              {
                error:
                  deleteError instanceof Error
                    ? deleteError.message
                    : "Unknown error",
                eventId: event.id,
                externalEventId,
              },
              LOG_SOURCE
            );
          }
        }
      }

      // Update the feed's last sync time
      await this.prisma.calendarFeed.update({
        where: { id: feed.id },
        data: {
          lastSync: newDate(),
        },
      });

      logger.info(
        "Completed CalDAV calendar sync",
        {
          added: added.length,
          updated: updated.length,
          deleted: deletedIds.length,
          calendarPath,
          accountId: this.account.id,
        },
        LOG_SOURCE
      );

      return {
        added,
        updated,
        deleted: deletedIds,
      };
    } catch (error) {
      logger.error(
        "Failed to sync CalDAV calendar",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          calendarPath,
          accountId: this.account.id,
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Expands recurring events for a given time range
   * @param icalData iCalendar data as string
   * @param start Start date of the range
   * @param end End date of the range
   * @returns Array of expanded events
   */
  private expandRecurringEvents(
    icalData: string,
    start: Date,
    end: Date
  ): CalendarEvent[] {
    try {
      // Parse the iCalendar data
      const jcalData = ICAL.parse(icalData);
      const vcalendar = new ICAL.Component(jcalData);

      // Get all VEVENT components (master and exceptions)
      const allEvents = vcalendar.getAllSubcomponents("vevent");

      if (allEvents.length === 0) {
        return [];
      }

      // Find the master event (the one with a recurrence rule)
      const masterEvent = allEvents.find(
        (event) =>
          event.hasProperty("rrule") && !event.hasProperty("recurrence-id")
      );

      if (!masterEvent) {
        // If no master event found, just convert the first event
        return [this.convertVEventToCalendarEvent(allEvents[0])];
      }

      // Create an ICAL.Event which handles recurrence expansion
      const icalEvent = new ICAL.Event(masterEvent);

      if (!icalEvent.isRecurring()) {
        // If it's not actually recurring, just return the single event
        return [this.convertVEventToCalendarEvent(masterEvent)];
      }

      // Create a recurrence iterator
      const startTime = ICAL.Time.fromJSDate(start);
      const endTime = ICAL.Time.fromJSDate(end);

      // Get the recurrence iterator
      const iterator = icalEvent.iterator();

      // Collect all instances
      const instances: CalendarEvent[] = [];
      const masterCalendarEvent =
        this.convertVEventToCalendarEvent(masterEvent);

      // Add the master event
      instances.push({
        ...masterCalendarEvent,
        isMaster: true,
      });

      // Find all exception events (events with recurrence-id)
      const exceptionEvents = allEvents.filter((event) =>
        event.hasProperty("recurrence-id")
      );

      // Create a map of exception dates to their events
      const exceptionMap = new Map<string, ICAL.Component>();
      for (const exception of exceptionEvents) {
        const recurrenceId = exception.getFirstPropertyValue("recurrence-id");
        if (recurrenceId) {
          // Use a more specific type for ICAL.Time
          const recurrenceDate = (
            recurrenceId as unknown as ICAL.Time
          ).toJSDate();
          exceptionMap.set(
            recurrenceDate.toISOString().split("T")[0],
            exception
          );
        }
      }

      // Iterate through occurrences
      let next: ICAL.Time | null;
      while ((next = iterator.next()) && next.compare(endTime) <= 0) {
        // Skip occurrences before our start date
        if (next.compare(startTime) < 0) continue;

        // Check if this occurrence has an exception
        const occurrenceDate = (next as unknown as ICAL.Time).toJSDate();
        const dateKey = occurrenceDate.toISOString().split("T")[0];

        if (exceptionMap.has(dateKey)) {
          // Use the exception event
          const exceptionEvent = exceptionMap.get(dateKey)!;
          const exceptionCalendarEvent =
            this.convertVEventToCalendarEvent(exceptionEvent);

          instances.push({
            ...exceptionCalendarEvent,
            isMaster: false,
            masterEventId: masterCalendarEvent.id,
          });
        } else {
          // Create a new instance based on the master event
          const instanceStart = (next as unknown as ICAL.Time).toJSDate();

          // Calculate the duration from the master event
          const masterStart = new Date(masterCalendarEvent.start);
          const masterEnd = new Date(masterCalendarEvent.end);
          const duration = masterEnd.getTime() - masterStart.getTime();

          // Calculate the instance end time
          const instanceEnd = new Date(instanceStart.getTime() + duration);

          instances.push({
            ...masterCalendarEvent,
            id: `${masterCalendarEvent.id}_${instanceStart.toISOString()}`,
            start: instanceStart,
            end: instanceEnd,
            isMaster: false,
            masterEventId: masterCalendarEvent.id,
          });
        }
      }

      return instances;
    } catch (error) {
      logger.error(
        "Failed to expand recurring events",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );
      return [];
    }
  }

  /**
   * Converts a VEVENT component to a CalendarEvent
   * @param vevent VEVENT component
   * @param vcalendar Parent VCALENDAR component
   * @returns Converted calendar event
   */
  private convertVEventToCalendarEvent(vevent: ICAL.Component): CalendarEvent {
    try {
      // Extract event properties
      const uid = vevent.getFirstPropertyValue("uid");
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

      const isAllDay = dtstart.getParameter("value") === "date";

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
            endDate = new Date(
              startDate.getTime() + duration.toSeconds() * 1000
            );
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

      // Convert iCalendar recurrence rule to RRule string format if present
      const recurrenceRuleString = isRecurring
        ? convertICalRRuleToRRuleString(rrule as unknown as ICalRRule)
        : null;

      // Create a partial CalendarEvent object
      return {
        id: uid,
        feedId: "", // This would need to be set when saving to the database
        externalEventId: uid,
        title: summary || "Untitled Event",
        description: description || null,
        start: startDate,
        end: endDate,
        location: location || null,
        isRecurring,
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
        isMaster: isRecurring && !recurrenceId,
        masterEventId: null,
        recurringEventId: recurrenceId ? String(uid) : null,
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
}
