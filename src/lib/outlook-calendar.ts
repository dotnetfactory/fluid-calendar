import { Client } from "@microsoft/microsoft-graph-client";
import { ConnectedAccount } from "@prisma/client";
import { Frequency, RRule } from "rrule";

import { logger } from "@/lib/logger";

import { useSettingsStore } from "@/store/settings";

import { createOutlookAllDayDate, newDate, newDateFromYMD } from "./date-utils";
import { MSGraphCalendar, MSGraphUser } from "./outlook";
import { TokenManager } from "./token-manager";

const LOG_SOURCE = "OutlookCalendar";

export interface MSGraphEvent {
  id: string;
  subject: string;
  body?: {
    contentType: string;
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  isAllDay?: boolean;
  recurrence?: {
    pattern: {
      type: string;
      interval: number;
      month?: number;
      dayOfMonth?: number;
      daysOfWeek?: string[];
      firstDayOfWeek?: string;
      index?: string;
    };
    range: {
      type: string;
      startDate: string;
      endDate?: string;
      numberOfOccurrences?: number;
    };
  };
  instances?: MSGraphEvent[];
  type?: "occurrence" | "exception" | "seriesMaster";
  seriesMasterId?: string;
  isOrganizer?: boolean;
  showAs?: string;
  attendees?: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
    type: "required" | "optional";
    status: {
      response: "none" | "accepted" | "tentative" | "declined";
    };
  }>;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
}

export class OutlookCalendarService {
  private client: Client;
  private tokenManager: TokenManager;

  constructor(private account: ConnectedAccount) {
    this.tokenManager = TokenManager.getInstance();
    this.client = this.createClient();
  }

  private createClient(): Client {
    return Client.init({
      authProvider: async (done) => {
        try {
          // Check if token needs refresh
          if (newDate(this.account.expiresAt) <= newDate()) {
            await this.refreshToken();
          }
          done(null, this.account.accessToken);
        } catch (error) {
          done(error as Error, null);
        }
      },
      defaultVersion: "v1.0",
      debugLogging: true,
    });
  }

  private async refreshToken(): Promise<void> {
    try {
      if (!this.account.refreshToken) {
        throw new Error("No refresh token available");
      }
      if (!this.account.userId) {
        throw new Error("No user ID available");
      }

      const tokens = await this.tokenManager.refreshOutlookTokens(
        this.account.id,
        this.account.userId
      );

      if (!tokens) {
        throw new Error("Failed to refresh tokens");
      }

      // Update local account reference with new tokens
      this.account = {
        ...this.account,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || this.account.refreshToken,
        expiresAt: tokens.expiresAt,
      };
    } catch (error) {
      logger.error(
        "Failed to refresh token",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  async getUserProfile(): Promise<MSGraphUser> {
    try {
      return await this.client.api("/me").get();
    } catch (error) {
      logger.error(
        "Failed to get user profile",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  async listCalendars(): Promise<MSGraphCalendar[]> {
    try {
      const response = await this.client.api("/me/calendars").get();
      return response.value;
    } catch (error) {
      logger.error(
        "Failed to list calendars",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  async getCalendar(calendarId: string): Promise<MSGraphCalendar> {
    try {
      return await this.client.api(`/me/calendars/${calendarId}`).get();
    } catch (error) {
      logger.error(
        "Failed to get calendar",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  async listEvents(
    calendarId: string,
    options: {
      startTime?: Date;
      endTime?: Date;
      maxResults?: number;
      syncToken?: string;
    } = {}
  ): Promise<{
    events: MSGraphEvent[];
    nextSyncToken?: string;
  }> {
    try {
      let apiUrl = `/me/calendars/${calendarId}/events`;
      const queryParams: string[] = [];

      if (options.syncToken) {
        // When using delta sync, we don't apply time filters as we want all changes
        apiUrl = `/me/calendars/${calendarId}/events/delta`;
        queryParams.push(`$deltatoken=${options.syncToken}`);
      } else {
        // For initial sync, use a much wider time range to get all events
        const defaultStartTime = newDateFromYMD(
          newDate().getFullYear() - 5,
          0,
          1
        ); // 5 years ago
        const defaultEndTime = newDateFromYMD(
          newDate().getFullYear() + 3,
          11,
          31
        ); // 3 years ahead

        const filterParts: string[] = [
          `start/dateTime ge '${defaultStartTime.toISOString()}'`,
          `end/dateTime le '${defaultEndTime.toISOString()}'`,
        ];
        queryParams.push(`$filter=${filterParts.join(" and ")}`);
      }

      // Add $expand to get recurring event instances with the same time window
      queryParams.push(
        "$expand=instances($filter=" +
          `start/dateTime ge '${newDateFromYMD(
            newDate().getFullYear() - 5,
            0,
            1
          ).toISOString()}' and ` +
          `end/dateTime le '${newDateFromYMD(
            newDate().getFullYear() + 3,
            11,
            31
          ).toISOString()}')`
      );

      if (options.maxResults) {
        queryParams.push(`$top=${options.maxResults}`);
      }

      // Always include these fields
      queryParams.push(
        "$select=id,subject,body,start,end,location,attendees,recurrence,isAllDay,createdDateTime,lastModifiedDateTime,showAs,type,seriesMasterId"
      );

      const finalUrl =
        queryParams.length > 0 ? `${apiUrl}?${queryParams.join("&")}` : apiUrl;

      const response = await this.client.api(finalUrl).get();

      let events = response.value;

      // Process recurring events and their instances
      events = events.flatMap((event: MSGraphEvent) => {
        if (event.recurrence) {
          // This is a master event
          const instances = event.instances || [];
          return [
            {
              ...event,
              isMaster: true,
              type: "seriesMaster",
              recurrenceRule: event.recurrence
                ? JSON.stringify(event.recurrence)
                : null,
            },
            ...instances.map((instance: MSGraphEvent) => ({
              ...instance,
              isMaster: false,
              type: "occurrence",
              seriesMasterId: event.id,
              recurrenceRule: event.recurrence
                ? JSON.stringify(event.recurrence)
                : null,
            })),
          ];
        }
        return [event];
      });

      return {
        events,
        nextSyncToken: response["@odata.deltaLink"]?.split("deltatoken=")[1],
      };
    } catch (error) {
      logger.error(
        "Failed to list events",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  async createEvent(
    calendarId: string,
    event: Partial<MSGraphEvent>
  ): Promise<MSGraphEvent> {
    try {
      return await this.client
        .api(`/me/calendars/${calendarId}/events`)
        .post(event);
    } catch (error) {
      logger.error(
        "Failed to create event",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  async updateEvent(
    calendarId: string,
    eventId: string,
    event: Partial<MSGraphEvent>
  ): Promise<MSGraphEvent> {
    try {
      return await this.client
        .api(`/me/calendars/${calendarId}/events/${eventId}`)
        .patch(event);
    } catch (error) {
      logger.error(
        "Failed to update event",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    try {
      await this.client
        .api(`/me/calendars/${calendarId}/events/${eventId}`)
        .delete();
    } catch (error) {
      logger.error(
        "Failed to delete event",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );
      throw error;
    }
  }
}

export async function getOutlookClient(accountId: string, userId: string) {
  const tokenManager = TokenManager.getInstance();

  // Get tokens for the account
  let tokens = await tokenManager.getTokens(accountId, userId);
  if (!tokens) {
    throw new Error("No tokens found for account");
  }

  // Check if token needs refresh
  if (tokens.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    tokens = await tokenManager.refreshOutlookTokens(accountId, userId);
    if (!tokens) {
      throw new Error("Failed to refresh tokens");
    }
  }

  return Client.init({
    authProvider: async (done) => {
      done(null, tokens!.accessToken);
    },
    defaultVersion: "v1.0",
  });
}

export async function listOutlookCalendars(accountId: string, userId: string) {
  const client = await getOutlookClient(accountId, userId);
  try {
    const response = await client.api("/me/calendars").get();
    return response.value;
  } catch (error) {
    logger.error(
      "Failed to list calendars",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
    throw error;
  }
}

export async function createOutlookEvent(
  accountId: string,
  userId: string,
  calendarId: string,
  event: {
    title: string;
    description?: string;
    location?: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    isRecurring?: boolean;
    recurrenceRule?: string;
  }
) {
  const client = await getOutlookClient(accountId, userId);
  const timeZone = useSettingsStore.getState().user.timeZone;

  // Convert RRule to Outlook recurrence pattern if present
  let recurrence;
  if (event.isRecurring && event.recurrenceRule) {
    console.log(
      "Converting RRule to Outlook recurrence:",
      event.recurrenceRule
    );
    const rrule = RRule.fromString("RRULE:" + event.recurrenceRule);
    recurrence = convertRRuleToOutlookRecurrence(rrule);
    console.log("Converted recurrence pattern:", recurrence);
  }

  // Special handling for all-day events - ensure they are at midnight UTC
  let startDate = event.start;
  let endDate = event.end;

  if (event.allDay) {
    // Use ISO date strings to handle all-day events, ensuring they start/end at midnight UTC
    const startStr = event.start.toISOString().split("T")[0];

    // For all-day events, Outlook requires the end date to be the NEXT day at midnight UTC
    // (to represent the end of the day, as the event duration must be at least 24 hours)

    // First, check if start and end are the same day
    const sameDay =
      event.start.toISOString().split("T")[0] ===
      event.end.toISOString().split("T")[0];

    // If they are the same day, add one day to the end date
    if (sameDay) {
      // Create a new date object for the next day
      const nextDay = new Date(event.end);
      nextDay.setDate(nextDay.getDate() + 1);
      const endStr = nextDay.toISOString().split("T")[0];

      startDate = createOutlookAllDayDate(startStr);
      endDate = createOutlookAllDayDate(endStr);
    } else {
      // If multi-day event, use the existing end date but ensure it's at midnight UTC
      const endStr = event.end.toISOString().split("T")[0];
      startDate = createOutlookAllDayDate(startStr);
      endDate = createOutlookAllDayDate(endStr);
    }

    // Log the dates for debugging
    console.log("All-day event dates:", {
      originalStart: event.start,
      originalEnd: event.end,
      adjustedStart: startDate,
      adjustedEnd: endDate,
      sameDay: sameDay,
    });
  }

  // Format dates in ISO format for Outlook
  const eventData = {
    subject: event.title,
    body: {
      contentType: "text",
      content: event.description || "",
    },
    start: {
      dateTime: startDate.toISOString(),
      timeZone,
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone,
    },
    location: event.location ? { displayName: event.location } : undefined,
    isAllDay: event.allDay,
    ...(recurrence && { recurrence }),
  };

  console.log("Creating Outlook event with data:", eventData);
  const response = await client
    .api(`/me/calendars/${calendarId}/events`)
    .post(eventData);
  return response;
}

export async function getOutlookEvent(
  accountId: string,
  userId: string,
  calendarId: string,
  eventId: string
) {
  const client = await getOutlookClient(accountId, userId);

  try {
    const event = await client
      .api(`/me/calendars/${calendarId}/events/${eventId}`)
      .get();

    let instances: MSGraphEvent[] = [];
    let masterEvent = event;

    // If this is an instance of a recurring event
    if (event.seriesMasterId) {
      try {
        masterEvent = await client
          .api(`/me/calendars/${calendarId}/events/${event.seriesMasterId}`)
          .get();
      } catch (error) {
        logger.error(
          "Failed to get master event",
          {
            error: error instanceof Error ? error.message : "Unknown error",
          },
          LOG_SOURCE
        );
        masterEvent = event;
      }
    }

    // If this is a recurring event, get instances
    if (masterEvent.recurrence) {
      const response = await client
        .api(`/me/calendars/${calendarId}/events/${masterEvent.id}/instances`)
        .query({
          startDateTime: newDateFromYMD(
            newDate().getFullYear(),
            0,
            1
          ).toISOString(),
          endDateTime: newDateFromYMD(
            newDate().getFullYear() + 1,
            0,
            1
          ).toISOString(),
        })
        .get();

      instances = response.value || [];
    }

    return {
      event: masterEvent,
      instances,
    };
  } catch (error) {
    logger.error(
      "Failed to get event",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
    throw error;
  }
}

export async function updateOutlookEvent(
  accountId: string,
  userId: string,
  calendarId: string,
  eventId: string,
  event: {
    title?: string;
    description?: string;
    location?: string;
    start?: Date;
    end?: Date;
    allDay?: boolean;
    isRecurring?: boolean;
    recurrenceRule?: string;
    mode?: "single" | "series";
  }
) {
  const client = await getOutlookClient(accountId, userId);
  const timeZone = useSettingsStore.getState().user.timeZone;

  try {
    // Get the event to check if it's part of a series
    const existingEvent = await client
      .api(`/me/calendars/${calendarId}/events/${eventId}`)
      .get();

    // For series updates, use the master event ID
    const targetEventId =
      event.mode === "series" && existingEvent.seriesMasterId
        ? existingEvent.seriesMasterId
        : eventId;

    // Convert RRule to Outlook recurrence pattern if present
    let recurrence;
    if (event.isRecurring && event.recurrenceRule) {
      const rrule = RRule.fromString(event.recurrenceRule);
      recurrence = convertRRuleToOutlookRecurrence(rrule);
    }

    // Special handling for all-day events - ensure they are at midnight UTC
    let startDate = event.start;
    let endDate = event.end;

    if (event.allDay && event.start && event.end) {
      // Use ISO date strings to handle all-day events, ensuring they start/end at midnight UTC
      const startStr = event.start.toISOString().split("T")[0];

      // For all-day events, Outlook requires the end date to be the NEXT day at midnight UTC
      // (to represent the end of the day, as the event duration must be at least 24 hours)

      // First, check if start and end are the same day
      const sameDay =
        event.start.toISOString().split("T")[0] ===
        event.end.toISOString().split("T")[0];

      // If they are the same day, add one day to the end date
      if (sameDay) {
        // Create a new date object for the next day
        const nextDay = new Date(event.end);
        nextDay.setDate(nextDay.getDate() + 1);
        const endStr = nextDay.toISOString().split("T")[0];

        startDate = createOutlookAllDayDate(startStr);
        endDate = createOutlookAllDayDate(endStr);
      } else {
        // If multi-day event, use the existing end date but ensure it's at midnight UTC
        const endStr = event.end.toISOString().split("T")[0];
        startDate = createOutlookAllDayDate(startStr);
        endDate = createOutlookAllDayDate(endStr);
      }

      // Log the dates for debugging
      console.log("All-day event update dates:", {
        originalStart: event.start,
        originalEnd: event.end,
        adjustedStart: startDate,
        adjustedEnd: endDate,
        sameDay: sameDay,
      });
    }

    const response = await client
      .api(`/me/calendars/${calendarId}/events/${targetEventId}`)
      .patch({
        subject: event.title,
        body: event.description
          ? {
              contentType: "text",
              content: event.description,
            }
          : undefined,
        start: startDate
          ? {
              dateTime: startDate.toISOString(),
              timeZone,
            }
          : undefined,
        end: endDate
          ? {
              dateTime: endDate.toISOString(),
              timeZone,
            }
          : undefined,
        location: event.location ? { displayName: event.location } : undefined,
        isAllDay: event.allDay,
        recurrence,
      });

    return response;
  } catch (error) {
    logger.error(
      "Failed to update Outlook event",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        eventId,
      },
      LOG_SOURCE
    );
    throw error;
  }
}

export async function deleteOutlookEvent(
  accountId: string,
  userId: string,
  calendarId: string,
  eventId: string,
  mode: "single" | "series" = "single"
) {
  const client = await getOutlookClient(accountId, userId);

  try {
    // Get the event to check if it's part of a series
    const event = await client
      .api(`/me/calendars/${calendarId}/events/${eventId}`)
      .get();

    // For series deletion, use the master event ID
    const targetEventId =
      mode === "series" && event.seriesMasterId
        ? event.seriesMasterId
        : eventId;

    await client
      .api(`/me/calendars/${calendarId}/events/${targetEventId}`)
      .delete();
  } catch (error) {
    logger.error(
      "Failed to delete event",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
    throw error;
  }
}

function convertRRuleToOutlookRecurrence(rrule: RRule) {
  const options = rrule.options;
  const pattern: {
    type: string;
    interval: number;
    daysOfWeek?: string[];
    dayOfMonth?: number;
    month?: number;
  } = {
    type: Frequency[options.freq].toLowerCase(),
    interval: options.interval || 1,
  };

  if (options.byweekday) {
    pattern.daysOfWeek = options.byweekday.map(
      (day: number | { toString: () => string }) => {
        // RRule uses 0-6 for weekdays, but can also pass in MO, TU, etc.
        if (typeof day === "number") {
          const days = [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ];
          return days[day];
        } else {
          // Handle string weekday codes (MO, TU, etc.)
          const weekdayMap: { [key: string]: string } = {
            SU: "sunday",
            MO: "monday",
            TU: "tuesday",
            WE: "wednesday",
            TH: "thursday",
            FR: "friday",
            SA: "saturday",
          };
          const dayStr = day.toString().toUpperCase();
          console.log("Converting RRule weekday to Outlook:", {
            rruleDay: dayStr,
            outlookDay: weekdayMap[dayStr],
          });
          return weekdayMap[dayStr];
        }
      }
    );
  }

  if (options.bymonthday) {
    pattern.dayOfMonth = options.bymonthday[0];
  }

  if (options.bymonth) {
    pattern.month = options.bymonth[0];
  }

  // Format dates in YYYY-MM-DD format for Outlook
  const startDateStr = options.dtstart.toISOString().split("T")[0];

  const range: {
    type: "endDate" | "numbered" | "noEnd";
    startDate: string;
    endDate?: string;
    numberOfOccurrences?: number;
  } = {
    type: options.until ? "endDate" : options.count ? "numbered" : "noEnd",
    startDate: startDateStr,
  };

  if (options.until) {
    range.endDate = options.until.toISOString().split("T")[0];
  }

  if (options.count) {
    range.numberOfOccurrences = options.count;
  }

  return { pattern, range };
}

export function convertOutlookRecurrenceToRRule(recurrence: {
  pattern: {
    type: string;
    interval: number;
    daysOfWeek?: string[];
    dayOfMonth?: number;
    month?: number;
    firstDayOfWeek?: string;
    index?: string;
  };
  range: {
    type: string;
    startDate: string;
    endDate?: string;
    numberOfOccurrences?: number;
    recurrenceTimeZone?: string;
  };
}): string {
  // Convert Outlook's relativemonthly to standard monthly with BYDAY
  let freq = recurrence.pattern.type.toUpperCase();
  if (freq === "RELATIVEMONTHLY") {
    freq = "MONTHLY";
  }

  const interval = recurrence.pattern.interval;
  const parts = [`FREQ=${freq}`, `INTERVAL=${interval}`];

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
      const weekIndex =
        {
          first: 1,
          second: 2,
          third: 3,
          fourth: 4,
          last: -1,
        }[recurrence.pattern.index.toLowerCase()] || 1;

      const days = recurrence.pattern.daysOfWeek
        .map((day) => `${weekIndex}${day.slice(0, 2).toUpperCase()}`)
        .join(",");
      parts.push(`BYDAY=${days}`);
    } else {
      // Regular weekly recurrence
      const days = recurrence.pattern.daysOfWeek
        .map((day) => day.slice(0, 2).toUpperCase())
        .join(",");
      parts.push(`BYDAY=${days}`);
    }
  }

  // Add BYMONTHDAY for monthly recurrence
  if (recurrence.pattern.dayOfMonth) {
    parts.push(`BYMONTHDAY=${recurrence.pattern.dayOfMonth}`);
  }

  // Add BYMONTH for yearly recurrence
  if (recurrence.pattern.month) {
    parts.push(`BYMONTH=${recurrence.pattern.month}`);
  }

  // Add COUNT or UNTIL for end date
  if (
    recurrence.range.type === "numbered" &&
    recurrence.range.numberOfOccurrences
  ) {
    parts.push(`COUNT=${recurrence.range.numberOfOccurrences}`);
  } else if (recurrence.range.type === "endDate" && recurrence.range.endDate) {
    // Convert the date to YYYYMMDD format without hyphens
    const untilDate = recurrence.range.endDate.replace(/-/g, "");
    parts.push(`UNTIL=${untilDate}T235959Z`);
  }

  // Add DTSTART
  const dtstart = recurrence.range.startDate.replace(/-/g, "");
  parts.push(`DTSTART=${dtstart}T000000Z`);

  return `RRULE:${parts.join(";")}`;
}
