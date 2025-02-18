import { Client } from "@microsoft/microsoft-graph-client";
import { PrismaClient } from "@prisma/client";
import { ConnectedAccount } from "@prisma/client";
import { MSGraphCalendar, MSGraphUser } from "./outlook";
import { TokenManager } from "./token-manager";
import { logger } from "./logger";
import { RRule, Frequency } from "rrule";
import { useSettingsStore } from "@/store/settings";

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

  constructor(private prisma: PrismaClient, private account: ConnectedAccount) {
    this.tokenManager = TokenManager.getInstance();
    this.client = this.createClient();
  }

  private createClient(): Client {
    return Client.init({
      authProvider: async (done) => {
        try {
          // Check if token needs refresh
          if (new Date(this.account.expiresAt) <= new Date()) {
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

      const tokens = await this.tokenManager.refreshOutlookTokens(
        this.account.id
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
      logger.log("Failed to refresh token", { error });
      throw error;
    }
  }

  async getUserProfile(): Promise<MSGraphUser> {
    try {
      return await this.client.api("/me").get();
    } catch (error) {
      logger.log("Failed to get user profile", { error });
      throw error;
    }
  }

  async listCalendars(): Promise<MSGraphCalendar[]> {
    try {
      const response = await this.client.api("/me/calendars").get();
      return response.value;
    } catch (error) {
      logger.log("Failed to list calendars", { error });
      throw error;
    }
  }

  async getCalendar(calendarId: string): Promise<MSGraphCalendar> {
    try {
      return await this.client.api(`/me/calendars/${calendarId}`).get();
    } catch (error) {
      logger.log("Failed to get calendar", { error });
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
        const defaultStartTime = new Date(new Date().getFullYear() - 5, 0, 1); // 5 years ago
        const defaultEndTime = new Date(new Date().getFullYear() + 3, 11, 31); // 3 years ahead

        const filterParts: string[] = [
          `start/dateTime ge '${defaultStartTime.toISOString()}'`,
          `end/dateTime le '${defaultEndTime.toISOString()}'`,
        ];
        queryParams.push(`$filter=${filterParts.join(" and ")}`);
      }

      // Add $expand to get recurring event instances with the same time window
      queryParams.push(
        "$expand=instances($filter=" +
          `start/dateTime ge '${new Date(
            new Date().getFullYear() - 5,
            0,
            1
          ).toISOString()}' and ` +
          `end/dateTime le '${new Date(
            new Date().getFullYear() + 3,
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
      logger.log("Failed to list events", { error });
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
      logger.log("Failed to create event", { error });
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
      logger.log("Failed to update event", { error });
      throw error;
    }
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    try {
      await this.client
        .api(`/me/calendars/${calendarId}/events/${eventId}`)
        .delete();
    } catch (error) {
      logger.log("Failed to delete event", { error });
      throw error;
    }
  }
}

export async function getOutlookCalendarClient(accountId: string) {
  const tokenManager = TokenManager.getInstance();

  // Get tokens for the account
  let tokens = await tokenManager.getTokens(accountId);
  if (!tokens) {
    throw new Error("No tokens found for account");
  }

  // Check if token needs refresh
  if (tokens.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    tokens = await tokenManager.refreshOutlookTokens(accountId);
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

export async function listOutlookCalendars(accountId: string) {
  const client = await getOutlookCalendarClient(accountId);
  try {
    const response = await client.api("/me/calendars").get();
    return response.value;
  } catch (error) {
    logger.log("Failed to list calendars", { error });
    throw error;
  }
}

export async function createOutlookEvent(
  accountId: string,
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
  const client = await getOutlookCalendarClient(accountId);
  const timeZone = useSettingsStore.getState().user.timeZone;

  // Convert RRule to Outlook recurrence pattern if present
  let recurrence;
  if (event.isRecurring && event.recurrenceRule) {
    const rrule = RRule.fromString(event.recurrenceRule);
    recurrence = convertRRuleToOutlookRecurrence(rrule);
  }

  const response = await client.api(`/me/calendars/${calendarId}/events`).post({
    subject: event.title,
    body: {
      contentType: "text",
      content: event.description || "",
    },
    start: {
      dateTime: event.start.toISOString(),
      timeZone,
    },
    end: {
      dateTime: event.end.toISOString(),
      timeZone,
    },
    location: event.location ? { displayName: event.location } : undefined,
    isAllDay: event.allDay,
    recurrence,
  });

  return response;
}

export async function updateOutlookEvent(
  accountId: string,
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
  const client = await getOutlookCalendarClient(accountId);
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
        start: event.start
          ? {
              dateTime: event.start.toISOString(),
              timeZone,
            }
          : undefined,
        end: event.end
          ? {
              dateTime: event.end.toISOString(),
              timeZone,
            }
          : undefined,
        location: event.location ? { displayName: event.location } : undefined,
        isAllDay: event.allDay,
        recurrence,
      });

    return response;
  } catch (error) {
    logger.log("Failed to update event", { error });
    throw error;
  }
}

export async function deleteOutlookEvent(
  accountId: string,
  calendarId: string,
  eventId: string,
  mode: "single" | "series" = "single"
) {
  const client = await getOutlookCalendarClient(accountId);

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
    logger.log("Failed to delete event", { error });
    throw error;
  }
}

export async function getOutlookEvent(
  accountId: string,
  calendarId: string,
  eventId: string
) {
  const client = await getOutlookCalendarClient(accountId);

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
        logger.log("Failed to get master event", { error });
        masterEvent = event;
      }
    }

    // If this is a recurring event, get instances
    if (masterEvent.recurrence) {
      const response = await client
        .api(`/me/calendars/${calendarId}/events/${masterEvent.id}/instances`)
        .query({
          startDateTime: new Date(new Date().getFullYear(), 0, 1).toISOString(),
          endDateTime: new Date(
            new Date().getFullYear() + 1,
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
    logger.log("Failed to get event", { error });
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
    pattern.daysOfWeek = options.byweekday.map((day) => {
      const days = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
      return days[day].toString().toLowerCase();
    });
  }

  if (options.bymonthday) {
    pattern.dayOfMonth = options.bymonthday;
  }

  if (options.bymonth) {
    pattern.month = options.bymonth;
  }

  const range: {
    type: "endDate" | "numbered" | "noEnd";
    startDate: string;
    endDate?: string;
    numberOfOccurrences?: number;
  } = {
    type: options.until ? "endDate" : options.count ? "numbered" : "noEnd",
    startDate: options.dtstart.toISOString().split("T")[0],
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
  const freq = recurrence.pattern.type.toUpperCase();
  const interval = recurrence.pattern.interval;
  const parts = [`FREQ=${freq}`, `INTERVAL=${interval}`];

  // Add BYDAY for weekly recurrence
  if (
    recurrence.pattern.daysOfWeek &&
    recurrence.pattern.daysOfWeek.length > 0
  ) {
    const days = recurrence.pattern.daysOfWeek
      .map((day) => day.slice(0, 2).toUpperCase())
      .join(",");
    parts.push(`BYDAY=${days}`);
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
