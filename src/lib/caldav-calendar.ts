import { PrismaClient, CalendarEvent, ConnectedAccount } from "@prisma/client";
import { createDAVClient, DAVCalendar, DAVResponse, DAVDepth } from "tsdav";
import ICAL from "ical.js";
import { logger } from "@/lib/logger";
import { newDate, formatToLocalISOString } from "@/lib/date-utils";

const LOG_SOURCE = "CalDAVCalendar";

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
  data: string; // iCalendar data
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
                  start: formatToLocalISOString(start),
                  end: formatToLocalISOString(end),
                },
              },
            },
          },
        },
        depth: "1" as DAVDepth,
      });

      // Convert DAVResponse objects to CalDAVCalendarObject format
      const calendarData: CalDAVCalendarObject[] = calendarObjects.map(
        (obj: DAVResponse) => ({
          url: obj.href || "",
          etag: obj.props?.getetag || "",
          data: obj.props?.["calendar-data"] || "",
        })
      );

      // Convert iCalendar data to internal format
      return calendarData.map((obj: CalDAVCalendarObject) =>
        this.convertFromICalendar(obj)
      );
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
      const jcalData = ICAL.parse(calendarObject.data);
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
      const dtend = vevent.getFirstProperty("dtend");

      if (!dtstart || !dtend) {
        throw new Error("Event is missing start or end time");
      }

      const isAllDay = dtstart.getParameter("value") === "date";

      // Convert to JavaScript Date objects
      const dtstartValue = dtstart.getFirstValue();
      const dtendValue = dtend.getFirstValue();

      // Handle ICAL.js types properly by using type assertion
      // ICAL.Time objects have toJSDate() but TypeScript doesn't know this
      const startDate =
        typeof dtstartValue === "object" && dtstartValue !== null
          ? (dtstartValue as unknown as { toJSDate(): Date }).toJSDate()
          : new Date();

      const endDate =
        typeof dtendValue === "object" && dtendValue !== null
          ? (dtendValue as unknown as { toJSDate(): Date }).toJSDate()
          : new Date();

      // Check for recurrence
      const rrule = vevent.getFirstPropertyValue("rrule");
      const isRecurring = !!rrule;

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
        recurrenceRule: rrule ? JSON.stringify(rrule) : null,
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async syncCalendar(_calendarPath: string): Promise<SyncResult> {
    // This will be implemented in Phase 3
    throw new Error("Method not implemented");
  }
}
