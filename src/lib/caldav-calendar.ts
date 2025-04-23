import { CalendarEvent, ConnectedAccount, Prisma } from "@prisma/client";
import ICAL from "ical.js";
import { DAVDepth, DAVResponse, createDAVClient } from "tsdav";

import { newDate, newDateFromYMD } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import { CalendarEventWithFeed } from "@/types/calendar";

import { convertVEventToCalendarEvent } from "./caldav-helpers";
import {
  CalDAVCalendarObject,
  CalendarEventInput,
  CalendarQueryParams,
  ExtendedDAVClient,
  SyncResult,
} from "./caldav-interfaces";

const LOG_SOURCE = "CalDAVCalendar";

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
  constructor(private account: ConnectedAccount) {
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

  private async expandRecurringEvents(
    masterEvents: CalendarEvent[]
  ): Promise<CalendarEvent[]> {
    const instances: CalendarEvent[] = [];
    for (const masterEvent of masterEvents) {
      if (masterEvent.isRecurring) {
        const instanceEvents = await this.expandMasterEvent(masterEvent);
        instances.push(...instanceEvents);
      }
    }
    return instances;
  }

  private async expandMasterEvent(
    masterEvent: CalendarEvent
  ): Promise<CalendarEvent[]> {
    //todo expand master event locally and return all instances
    if (!masterEvent.isRecurring || !masterEvent.recurrenceRule) {
      return [];
    }

    try {
      // Import RRule from the rrule library
      const { RRule } = await import("rrule");

      // Define the time range for expansion (1 year back to 1 year ahead)
      const timeRange = this.getTimeRange();

      // Parse the recurrence rule
      const options = RRule.parseString(masterEvent.recurrenceRule);

      // Set the start date from the master event
      options.dtstart = masterEvent.start;

      // Create the RRule instance
      const rule = new RRule(options);

      // Get all occurrences between the start and end dates
      const occurrences = rule.between(timeRange.start, timeRange.end, true);

      // Create instance events for each occurrence
      const instanceEvents: CalendarEvent[] = occurrences
        .map((date) => {
          // Calculate the duration of the master event
          const duration =
            masterEvent.end.getTime() - masterEvent.start.getTime();

          // Create a new end date for this instance
          const endDate = new Date(date.getTime() + duration);

          // Create the instance event
          return {
            ...masterEvent,
            externalEventId: masterEvent.externalEventId,
            start: date,
            end: endDate,
            isRecurring: true,
            recurrenceRule: masterEvent.recurrenceRule,
            isMaster: false,
            recurringEventId: masterEvent.externalEventId,
          };
        })
        .filter(Boolean) as CalendarEvent[];

      return instanceEvents;
    } catch (error) {
      logger.error(
        "Failed to expand master event",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          eventId: masterEvent.id,
          title: masterEvent.title,
          recurrenceRule: masterEvent.recurrenceRule,
        },
        LOG_SOURCE
      );
      return [];
    }
  }

  /**
   * Fetches events from a CalDAV calendar for a specific time range
   * @param start Start date
   * @param end End date
   * @param calendarPath Path to the calendar
   * @returns Array of calendar events
   */
  private async getEvents(
    start: Date,
    end: Date,
    calendarPath: string
  ): Promise<CalendarEvent[]> {
    try {
      const client = await this.getClient();
      if (!client) return [];

      // Fetch master events (without expand)
      const masterEvents = await this.fetchMasterEvents(
        client,
        start,
        end,
        calendarPath
      );

      const instanceEvents = await this.expandRecurringEvents(masterEvents);

      const allEvents = [...masterEvents, ...instanceEvents];
      return allEvents;
    } catch (error) {
      logger.error(
        "Failed to fetch CalDAV events",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          accountId: this.account.id,
          calendarPath,
        },
        LOG_SOURCE
      );
      return [];
    }
  }

  /**
   * Format a date for CalDAV requests (YYYYMMDDTHHMMSSZ)
   * @param date Date to format
   * @returns Formatted date string
   */
  private formatDateForCalDAV(date: Date): string {
    return date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  }

  /**
   * Fetch master events from the CalDAV server
   * @param client CalDAV client
   * @param start Start date
   * @param end End date
   * @param calendarPath Path to the calendar
   * @returns Array of master events
   */
  private async fetchMasterEvents(
    client: ExtendedDAVClient,
    start: Date,
    end: Date,
    calendarPath: string
  ): Promise<CalendarEvent[]> {
    // Create query parameters for master events
    const queryParams = this.createCalDAVQueryParams(
      calendarPath,
      start,
      end,
      false // Don't use expand for master events
    );

    // Fetch calendar objects
    const calendarObjects = await client.calendarQuery(queryParams);

    // Process the calendar objects to extract master events
    return await this.processCalendarObjects(calendarObjects);
  }

  /**
   * Create CalDAV query parameters
   * @param calendarPath Path to the calendar
   * @param start Start date
   * @param end End date
   * @param useExpand Whether to use the expand parameter
   * @returns CalDAV query parameters
   */
  private createCalDAVQueryParams(
    calendarPath: string,
    start: Date,
    end: Date,
    useExpand: boolean
  ): CalendarQueryParams {
    const props: Record<string, unknown> = {
      "calendar-data": useExpand
        ? {
            expand: {
              _attributes: {
                start: this.formatDateForCalDAV(start),
                end: this.formatDateForCalDAV(end),
              },
            },
          }
        : {}, // No expand for master events
    };

    return {
      url: calendarPath,
      props,
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
                start: this.formatDateForCalDAV(start),
                end: this.formatDateForCalDAV(end),
              },
            },
          },
        },
      },
      depth: "1" as DAVDepth,
    };
  }

  /**
   * Process calendar objects returned by the CalDAV server
   * @param calendarObjects Calendar objects returned by the server
   * @param mode Whether to prioritize master events or instance events
   * @returns Array of calendar events
   */
  private async processCalendarObjects(
    calendarObjects: DAVResponse[]
  ): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];
    // Track UIDs to avoid duplicates
    const processedUids = new Set<string>();

    // Convert DAVResponse objects to CalDAVCalendarObject format
    const calendarData = this.extractCalendarData(calendarObjects);

    for (const obj of calendarData) {
      try {
        // Extract iCalendar data
        const icalData = this.extractICalData(obj);
        if (!icalData) continue;

        // Parse the iCalendar data
        const vevents = this.parseICalData(icalData, obj.url);
        if (!vevents || vevents.length === 0) continue;

        // Process each VEVENT component
        for (const vevent of vevents) {
          // Extract event properties
          const { uid, hasRRule, hasRecurrenceId } =
            this.extractEventProperties(vevent);

          // Convert VEVENT to CalendarEvent
          const event = convertVEventToCalendarEvent(vevent);

          // Set event properties based on its type
          this.setEventTypeProperties(
            event,
            uid,
            hasRRule,
            hasRecurrenceId,
            processedUids
          );
          events.push(event);
        }
      } catch (error) {
        logger.error(
          "Failed to process calendar object",
          {
            error: error instanceof Error ? error.message : "Unknown error",
            url: obj.url || "unknown",
          },
          LOG_SOURCE
        );
      }
    }

    return events;
  }

  /**
   * Extract calendar data from DAVResponse objects
   * @param calendarObjects Calendar objects returned by the server
   * @returns Array of calendar objects
   */
  private extractCalendarData(
    calendarObjects: DAVResponse[]
  ): CalDAVCalendarObject[] {
    return calendarObjects.map((obj: DAVResponse) => {
      // Get calendar data, which might be in different formats
      const calendarDataProp =
        obj.props?.["calendar-data"] || obj.props?.calendarData || "";

      return {
        url: obj.href || "",
        etag: obj.props?.getetag || "",
        data: calendarDataProp,
      };
    });
  }

  /**
   * Extract iCalendar data from a calendar object
   * @param obj Calendar object
   * @returns iCalendar data as string, or empty string if extraction fails
   */
  private extractICalData(obj: CalDAVCalendarObject): string {
    let icalData = "";
    if (typeof obj.data === "string") {
      icalData = obj.data;
    } else if (typeof obj.data === "object" && obj.data !== null) {
      // Try to get _cdata property if it exists
      const dataObj = obj.data as Record<string, unknown>;
      if ("_cdata" in dataObj && typeof dataObj._cdata === "string") {
        icalData = dataObj._cdata;
      } else {
        // Try to stringify the object as a fallback
        try {
          icalData = JSON.stringify(obj.data);
        } catch (error) {
          logger.warn(
            "Failed to stringify calendar data",
            {
              url: obj.url,
              error: error instanceof Error ? error.message : "Unknown error",
            },
            LOG_SOURCE
          );
          return ""; // Return empty string to indicate failure
        }
      }
    }

    if (!icalData) {
      logger.warn(
        "Empty iCalendar data",
        { url: obj.url || "unknown" },
        LOG_SOURCE
      );
    }

    return icalData;
  }

  /**
   * Parse iCalendar data and extract VEVENT components
   * @param icalData iCalendar data as string
   * @param url URL of the calendar object (for logging)
   * @returns Array of VEVENT components
   */
  private parseICalData(
    icalData: string,
    url: string
  ): ICAL.Component[] | null {
    try {
      const jcalData = ICAL.parse(icalData);
      const vcalendar = new ICAL.Component(jcalData);
      const vevents = vcalendar.getAllSubcomponents("vevent");
      return vevents;
    } catch (error) {
      logger.error(
        "Failed to parse iCalendar data",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          url,
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Synchronizes a CalDAV calendar with the local database
   * @param calendarPath Path to the calendar
   * @returns Sync result with added, updated, and deleted events
   */
  async syncCalendar(
    feedId: string,
    calendarPath: string,
    userId: string
  ): Promise<SyncResult> {
    try {
      // Get the calendar feed from the database
      const feed = await prisma.calendarFeed.findFirst({
        where: {
          url: calendarPath,
          accountId: this.account.id,
          type: "CALDAV",
          userId,
        },
      });

      if (!feed) {
        throw new Error(`Calendar feed not found for path: ${calendarPath}`);
      }
      //delete all events from the database
      await prisma.calendarEvent.deleteMany({
        where: {
          feedId: feed.id,
        },
      });

      // Get existing events for this feed
      // const existingEvents = await this.getExistingEvents(feed.id);

      // Define time range for events (1 year back to 1 year ahead)
      const timeRange = this.getTimeRange();

      // Fetch events from CalDAV server
      const events = await this.getEvents(
        timeRange.start,
        timeRange.end,
        calendarPath
      );

      // Process events and update database
      // const result = await this.processEvents(events, existingEvents, feed.id);

      const result = await this.createAllEvents(events, feed.id);
      // Update the feed's last sync time and sync token
      await prisma.calendarFeed.update({
        where: { id: feed.id, userId },
        data: {
          lastSync: newDate(),
          syncToken: feed.syncToken ? String(feed.syncToken) : null,
        },
      });

      return result;
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
   * Updates an existing event in a CalDAV calendar
   * @param calendarPath Path to the calendar
   * @param externalEventId ID of the event to update
   * @param event Updated event data
   * @returns Updated calendar event
   */
  async updateEvent(
    eventWithFeed: CalendarEventWithFeed,
    calendarPath: string,
    externalEventId: string,
    event: CalendarEventInput,
    mode: "single" | "series",
    userId: string
  ): Promise<CalendarEvent> {
    try {
      // Get the CalDAV client
      const client = await this.getClient();

      // For Fastmail compatibility, we'll use a PUT request to a specific URL
      // Ensure the calendar path doesn't have a trailing slash
      const normalizedCalendarPath = calendarPath.endsWith("/")
        ? calendarPath.slice(0, -1)
        : calendarPath;

      // Create a URL for the event using the externalEventId
      const eventUrl = `${normalizedCalendarPath}/${externalEventId}.ics`;

      // Generate the iCalendar data
      const icalData = this.convertToICalendar({
        ...event,
        id: externalEventId,
      });

      let response;
      try {
        // Try using PUT method first (works better with some CalDAV servers like Fastmail)
        response = await fetch(eventUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            Authorization:
              "Basic " +
              Buffer.from(
                `${this.account.caldavUsername || this.account.email}:${
                  this.account.accessToken
                }`
              ).toString("base64"),
          },
          body: icalData,
        });

        // Check if the response indicates success (2xx status code)
        if (response.status < 200 || response.status >= 300) {
          logger.error(
            "Server returned error status when updating event with PUT",
            {
              status: response.status,
              statusText: response.statusText,
              calendarPath,
              eventId: externalEventId,
              eventUrl,
              mode,
            },
            LOG_SOURCE
          );

          // If PUT fails, fall back to the updateObject method
          response = await client.updateObject({
            url: eventUrl,
            data: icalData,
            headers: {
              "Content-Type": "text/calendar; charset=utf-8",
            },
          });

          // Check if the fallback method also failed
          if (response.status < 200 || response.status >= 300) {
            logger.error(
              "Server returned error status when updating event with fallback method",
              {
                status: response.status,
                statusText: response.statusText,
                calendarPath,
                eventId: externalEventId,
                mode,
              },
              LOG_SOURCE
            );
            throw new Error(
              `Failed to update event on server: ${
                response.statusText || response.status
              }`
            );
          }
        }
      } catch (updateError) {
        logger.error(
          "Failed to update event on CalDAV server",
          {
            error:
              updateError instanceof Error
                ? updateError.message
                : "Unknown error",
            stack:
              updateError instanceof Error && updateError.stack
                ? updateError.stack
                : null,
            calendarPath,
            eventUrl,
            mode,
          },
          LOG_SOURCE
        );
        throw updateError;
      }

      // If updating a single instance of a recurring event
      if (mode === "single" && event.isRecurring) {
        // Get the master event
        const masterEvent = await prisma.calendarEvent.findFirst({
          where: {
            externalEventId: externalEventId.split("_")[0],
            feedId: eventWithFeed.feedId,
            isMaster: true,
          },
        });

        if (masterEvent && masterEvent.recurrenceRule) {
          // Create a RECURRENCE-ID for this instance
          const recurrenceId = new ICAL.Property("recurrence-id");
          recurrenceId.setValue(ICAL.Time.fromJSDate(event.start, false));
          recurrenceId.setParameter("value", "date-time");

          // Get the master event's iCalendar data
          const masterEventUrl = `${normalizedCalendarPath}/${masterEvent.externalEventId}.ics`;
          const masterEventResponse = await fetch(masterEventUrl, {
            headers: {
              Authorization:
                "Basic " +
                Buffer.from(
                  `${this.account.caldavUsername || this.account.email}:${
                    this.account.accessToken
                  }`
                ).toString("base64"),
            },
          });

          if (masterEventResponse.ok) {
            const icalData = await masterEventResponse.text();
            const jcalData = ICAL.parse(icalData);
            const vcalendar = new ICAL.Component(jcalData);
            const vevent = vcalendar.getFirstSubcomponent("vevent");

            if (vevent) {
              // Add the RECURRENCE-ID to the event
              vevent.addProperty(recurrenceId);

              // Update the event on the server
              await fetch(masterEventUrl, {
                method: "PUT",
                headers: {
                  "Content-Type": "text/calendar; charset=utf-8",
                  Authorization:
                    "Basic " +
                    Buffer.from(
                      `${this.account.caldavUsername || this.account.email}:${
                        this.account.accessToken
                      }`
                    ).toString("base64"),
                },
                body: vcalendar.toString(),
              });
            }
          }
        }
      }

      // Sync the calendar to get the updated event
      const syncResult = await this.syncCalendar(
        eventWithFeed.feedId,
        calendarPath,
        userId
      );

      // Find the updated event in the sync results
      const updatedEvent = syncResult.added.find(
        (e) => e.externalEventId === externalEventId
      );

      if (!updatedEvent) {
        throw new Error("Updated event not found in sync results");
      }

      return updatedEvent;
    } catch (error) {
      logger.error(
        "Failed to update CalDAV event",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          calendarPath,
          eventId: externalEventId,
          eventTitle: event.title,
          mode,
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Deletes an event from a CalDAV calendar
   * @param calendarPath Path to the calendar
   * @param eventId ID of the event to delete
   * @param mode Whether to delete a single instance or the entire series
   */
  async deleteEvent(
    event: CalendarEventWithFeed,
    calendarPath: string,
    externalEventId: string,
    mode: "single" | "series",
    userId: string
  ): Promise<void> {
    try {
      // Get the CalDAV client
      const client = await this.getClient();

      // For Fastmail compatibility, we'll use a DELETE request to a specific URL
      // Ensure the calendar path doesn't have a trailing slash
      const normalizedCalendarPath = calendarPath.endsWith("/")
        ? calendarPath.slice(0, -1)
        : calendarPath;

      // Create a URL for the event using the externalEventId
      const eventUrl = `${normalizedCalendarPath}/${externalEventId}.ics`;

      let response;
      try {
        // Try using DELETE method first (works better with some CalDAV servers like Fastmail)
        response = await fetch(eventUrl, {
          method: "DELETE",
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(
                `${this.account.caldavUsername || this.account.email}:${
                  this.account.accessToken
                }`
              ).toString("base64"),
          },
        });

        // Check if the response indicates success (2xx status code)
        if (response.status < 200 || response.status >= 300) {
          logger.error(
            "Server returned error status when deleting event with DELETE",
            {
              status: response.status,
              statusText: response.statusText,
              calendarPath,
              eventId: externalEventId,
              eventUrl,
              mode,
            },
            LOG_SOURCE
          );

          // If DELETE fails, fall back to the deleteObject method
          response = await client.deleteObject({
            url: eventUrl,
          });

          // Check if the fallback method also failed
          if (response.status < 200 || response.status >= 300) {
            logger.error(
              "Server returned error status when deleting event with fallback method",
              {
                status: response.status,
                statusText: response.statusText,
                calendarPath,
                eventId: externalEventId,
                mode,
              },
              LOG_SOURCE
            );
            throw new Error(
              `Failed to delete event on server: ${
                response.statusText || response.status
              }`
            );
          }
        }
      } catch (deleteError) {
        logger.error(
          "Failed to delete event on CalDAV server",
          {
            error:
              deleteError instanceof Error
                ? deleteError.message
                : "Unknown error",
            stack:
              deleteError instanceof Error && deleteError.stack
                ? deleteError.stack
                : null,
            calendarPath,
            eventUrl,
            mode,
          },
          LOG_SOURCE
        );
        throw deleteError;
      }

      // If deleting a single instance, we need to handle it differently
      if (mode === "single" && event.isRecurring && event.masterEventId) {
        // Get the master event
        const masterEvent = await prisma.calendarEvent.findFirst({
          where: {
            id: event.masterEventId,
            feedId: event.feedId,
          },
        });

        if (masterEvent && masterEvent.recurrenceRule) {
          // Create an EXDATE for this instance
          const exdate = new ICAL.Property("exdate");
          exdate.setValue(ICAL.Time.fromJSDate(event.start, false));
          exdate.setParameter("value", "date-time");

          // Get the master event's iCalendar data
          const masterEventUrl = `${normalizedCalendarPath}/${masterEvent.externalEventId}.ics`;
          const masterEventResponse = await fetch(masterEventUrl, {
            headers: {
              Authorization:
                "Basic " +
                Buffer.from(
                  `${this.account.caldavUsername || this.account.email}:${
                    this.account.accessToken
                  }`
                ).toString("base64"),
            },
          });

          if (masterEventResponse.ok) {
            const icalData = await masterEventResponse.text();
            const jcalData = ICAL.parse(icalData);
            const vcalendar = new ICAL.Component(jcalData);
            const vevent = vcalendar.getFirstSubcomponent("vevent");

            if (vevent) {
              // Add the EXDATE to the event
              vevent.addProperty(exdate);

              // Update the event on the server
              await fetch(masterEventUrl, {
                method: "PUT",
                headers: {
                  "Content-Type": "text/calendar; charset=utf-8",
                  Authorization:
                    "Basic " +
                    Buffer.from(
                      `${this.account.caldavUsername || this.account.email}:${
                        this.account.accessToken
                      }`
                    ).toString("base64"),
                },
                body: vcalendar.toString(),
              });
            }
          }
        }
      }

      // Sync the calendar to update our local database
      await this.syncCalendar(event.feedId, calendarPath, userId);
    } catch (error) {
      logger.error(
        "Failed to delete CalDAV event",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          calendarPath,
          eventId: externalEventId,
          mode,
        },
        LOG_SOURCE
      );
      throw error;
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
    calendar.updatePropertyWithValue("prodid", "-//FluidCalendar//EN");
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

      // Use ICAL.Time for all-day events with isDate=true
      const formatDate = (date: Date) => {
        const dateString = date.toISOString().split("T")[0];
        return ICAL.Time.fromDateString(dateString);
      };

      dtstart.setValue(formatDate(event.start));

      // For all-day events, the end date should be the next day in iCal
      // Make sure we create a new date to avoid mutating the original
      const endDate = new Date(event.end);
      dtend.setValue(formatDate(endDate));
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
      // Convert from RRule string format (e.g., "FREQ=DAILY;INTERVAL=1") to iCalendar format
      // The iCalendar format expects just the rule part without the property name
      const rruleValue = event.recurrenceRule;

      // Create a proper RRULE property
      const rruleProp = new ICAL.Property("rrule");

      // Parse the RRule string into an object
      const rruleObj: Record<string, string | number | string[]> = {};
      rruleValue.split(";").forEach((part) => {
        const [key, value] = part.split("=");
        if (key && value) {
          // Handle array values like BYDAY=MO,TU,WE
          if (value.includes(",")) {
            rruleObj[key.toLowerCase()] = value.split(",");
          } else if (!isNaN(Number(value))) {
            // Handle numeric values
            rruleObj[key.toLowerCase()] = Number(value);
          } else {
            // Handle string values
            rruleObj[key.toLowerCase()] = value;
          }
        }
      });

      // Set the value as a jCal-compatible object
      rruleProp.setValue(rruleObj);

      // Add the property to the event
      vevent.addProperty(rruleProp);
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
    calendarPath: string,
    event: CalendarEventInput,
    userId: string
  ): Promise<CalendarEvent> {
    try {
      // Generate a unique ID for the event if not provided
      const eventId = event.id || crypto.randomUUID();

      // Generate the iCalendar data
      const icalData = this.convertToICalendar({
        ...event,
        id: eventId,
      });

      // Get the CalDAV client
      const client = await this.getClient();

      // For Fastmail compatibility, we'll use a PUT request to a specific URL
      // Ensure the calendar path doesn't have a trailing slash
      const normalizedCalendarPath = calendarPath.endsWith("/")
        ? calendarPath.slice(0, -1)
        : calendarPath;

      // Create a URL for the event using the UID
      const eventUrl = `${normalizedCalendarPath}/${eventId}.ics`;

      let response;
      try {
        // Try using PUT method first (works better with some CalDAV servers like Fastmail)
        response = await fetch(eventUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "If-None-Match": "*", // Ensures we're creating a new resource
            Authorization:
              "Basic " +
              Buffer.from(
                `${this.account.caldavUsername || this.account.email}:${
                  this.account.accessToken
                }`
              ).toString("base64"),
          },
          body: icalData,
        });

        // Check if the response indicates success (2xx status code)
        if (response.status < 200 || response.status >= 300) {
          logger.error(
            "Server returned error status when creating event with PUT",
            {
              status: response.status,
              statusText: response.statusText,
              calendarPath,
              eventId,
              eventUrl,
            },
            LOG_SOURCE
          );

          // If PUT fails, fall back to the createObject method
          response = await client.createObject({
            url: calendarPath,
            data: icalData,
            headers: {
              "Content-Type": "text/calendar; charset=utf-8",
              "If-None-Match": "*", // Ensures we're creating a new resource
            },
          });

          // Check if the fallback method also failed
          if (response.status < 200 || response.status >= 300) {
            logger.error(
              "Server returned error status when creating event with fallback method",
              {
                status: response.status,
                statusText: response.statusText,
                calendarPath,
                eventId,
              },
              LOG_SOURCE
            );
            throw new Error(
              `Failed to create event on server: ${
                response.statusText || response.status
              }`
            );
          }
        }
      } catch (createError) {
        logger.error(
          "Failed to create event on CalDAV server",
          {
            error:
              createError instanceof Error
                ? createError.message
                : "Unknown error",
            stack:
              createError instanceof Error && createError.stack
                ? createError.stack
                : null,
            calendarPath,
            eventUrl,
          },
          LOG_SOURCE
        );
        throw createError;
      }

      // Get the calendar feed from the database
      const feed = await prisma.calendarFeed.findFirst({
        where: {
          url: calendarPath,
          accountId: this.account.id,
          type: "CALDAV",
          userId,
        },
      });

      if (!feed) {
        throw new Error(`Calendar feed not found for path: ${calendarPath}`);
      }

      // Sync the calendar to get the newly created event
      const syncResult = await this.syncCalendar(feed.id, calendarPath, userId);

      // Find the newly created event in the sync results
      const createdEvent = syncResult.added.find(
        (e) => e.externalEventId === eventId
      );

      if (!createdEvent) {
        throw new Error("Newly created event not found in sync results");
      }

      return createdEvent;
    } catch (error) {
      logger.error(
        "Failed to create CalDAV event",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          calendarPath,
          eventTitle: event.title,
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Define time range for events (1 year back to 1 year ahead)
   * @returns Object with start and end dates
   */
  private getTimeRange(): { start: Date; end: Date } {
    const now = newDate();
    return {
      start: newDateFromYMD(now.getFullYear() - 1, 0, 1), // 1 year ago, January 1st
      end: newDateFromYMD(now.getFullYear() + 1, 11, 31), // End of next year
    };
  }

  private async createAllEvents(
    events: CalendarEvent[],
    feedId: string
  ): Promise<SyncResult> {
    try {
      // Separate master events and instances
      const masterEvents = events.filter((e) => e.isMaster);
      const instanceEvents = events.filter((e) => !e.isMaster);

      // Create master events first
      const createdMasterEvents = await this.createMasterEvents(
        masterEvents,
        feedId
      );

      // Create a map of external IDs to database IDs for linking instances
      const masterEventMap = new Map<string, string>();
      for (const event of createdMasterEvents) {
        if (event.externalEventId) {
          masterEventMap.set(event.externalEventId, event.id);
        }
      }

      // Create instance events with proper links to master events
      const createdInstanceEvents = await this.createInstanceEvents(
        instanceEvents,
        masterEventMap,
        feedId
      );

      return {
        added: [...createdMasterEvents, ...createdInstanceEvents],
        updated: [],
        deleted: [],
      };
    } catch (error) {
      logger.error(
        "Failed to create CalDAV events",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          feedId,
        },
        LOG_SOURCE
      );
      return { added: [], updated: [], deleted: [] };
    }
  }

  private async createMasterEvents(
    masterEvents: CalendarEvent[],
    feedId: string
  ): Promise<CalendarEvent[]> {
    const createdEvents: CalendarEvent[] = [];

    // Process events in batches to avoid potential issues with large datasets
    for (const event of masterEvents) {
      try {
        // Prepare event data for database
        const eventData = {
          feedId,
          externalEventId: event.externalEventId,
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
          // Use Prisma.JsonNull for JSON fields
          organizer: Prisma.JsonNull,
          attendees: Prisma.JsonNull,
        };

        // Create the event
        const createdEvent = await prisma.calendarEvent.create({
          data: eventData,
        });

        createdEvents.push(createdEvent);
      } catch (error) {
        logger.error(
          "Failed to create master event",
          {
            error: error instanceof Error ? error.message : "Unknown error",
            eventId: event.id,
            title: event.title,
          },
          LOG_SOURCE
        );
      }
    }

    return createdEvents;
  }

  private async createInstanceEvents(
    instanceEvents: CalendarEvent[],
    masterEventMap: Map<string, string>,
    feedId: string
  ): Promise<CalendarEvent[]> {
    const createdEvents: CalendarEvent[] = [];

    // Process events in batches to avoid potential issues with large datasets
    for (const event of instanceEvents) {
      try {
        // Find the master event ID for this instance
        let masterEventId = null;
        if (
          event.recurringEventId &&
          masterEventMap.has(event.recurringEventId)
        ) {
          masterEventId = masterEventMap.get(event.recurringEventId) || null;
        }

        // Prepare event data for database
        const eventData = {
          feedId,
          externalEventId: event.externalEventId,
          title: event.title || "Untitled Event",
          description: event.description,
          start: event.start,
          end: event.end,
          location: event.location,
          isRecurring: event.isRecurring || false, // Instance events are not recurring themselves
          recurrenceRule: event.recurrenceRule, // Instance events don't have recurrence rules
          allDay: event.allDay || false,
          status: event.status,
          isMaster: false,
          masterEventId,
          recurringEventId: event.recurringEventId,
          // Use Prisma.JsonNull for JSON fields
          organizer: Prisma.JsonNull,
          attendees: Prisma.JsonNull,
        };

        // Create the event
        const createdEvent = await prisma.calendarEvent.create({
          data: eventData,
        });

        createdEvents.push(createdEvent);
      } catch (error) {
        logger.error(
          "Failed to create instance event",
          {
            error: error instanceof Error ? error.message : "Unknown error",
            eventId: event.id,
            title: event.title,
            recurringEventId: event.recurringEventId,
          },
          LOG_SOURCE
        );
      }
    }

    return createdEvents;
  }

  /**
   * Extract key properties from a VEVENT component
   * @param vevent VEVENT component
   * @returns Object with extracted properties
   */
  private extractEventProperties(vevent: ICAL.Component): {
    uid: string;
    hasRRule: boolean;
    hasRecurrenceId: boolean;
    summary: string | null;
  } {
    const hasRRule = vevent.hasProperty("rrule");
    const hasRecurrenceId = vevent.hasProperty("recurrence-id");
    const uidValue = vevent.getFirstPropertyValue("uid");
    const uid = uidValue ? String(uidValue) : crypto.randomUUID();
    const summary = vevent.getFirstPropertyValue("summary");

    return {
      uid,
      hasRRule,
      hasRecurrenceId,
      summary: summary ? String(summary) : null,
    };
  }

  /**
   * Set event properties based on its type (master, instance, or standalone)
   * @param event The event to update
   * @param uid The event's UID
   * @param hasRRule Whether the event has a recurrence rule
   * @param hasRecurrenceId Whether the event has a recurrence ID
   * @param processedUids Set of already processed UIDs
   */
  private setEventTypeProperties(
    event: CalendarEvent,
    uid: string,
    hasRRule: boolean,
    hasRecurrenceId: boolean,
    processedUids: Set<string>
  ): void {
    // Set event properties based on its type
    if (hasRRule && !hasRecurrenceId) {
      // Master event
      event.isMaster = true;
      event.isRecurring = true;
      event.masterEventId = null;
      event.externalEventId = uid;
      processedUids.add(uid);
    } else if (hasRecurrenceId) {
      // Instance event
      event.isMaster = false;
      event.isRecurring = false;
      // For instance events, we need to link to the master event
      // The master event's UID is the base part of the instance's UID (before any _date suffix)
      const masterUid = uid.split("_")[0];
      event.masterEventId = masterUid;
      // For instance events, we append the date to make the ID unique
      const instanceDate = event.start.toISOString().split("T")[0];
      event.externalEventId = `${masterUid}_${instanceDate}`;
      processedUids.add(event.externalEventId);
    } else {
      // Standalone event
      event.isMaster = false;
      event.isRecurring = false;
      event.masterEventId = null;
      event.externalEventId = uid;
      processedUids.add(uid);
    }
  }
}
