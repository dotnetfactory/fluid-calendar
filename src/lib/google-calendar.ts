import { calendar_v3, google } from "googleapis";

import { useSettingsStore } from "@/store/settings";

import { newDate, newDateFromYMD } from "./date-utils";
import { createGoogleOAuthClient } from "./google";
import { TokenManager } from "./token-manager";

type GoogleEvent = calendar_v3.Schema$Event;

export async function getGoogleCalendarClient(
  accountId: string,
  userId: string
) {
  console.log("Creating Google Calendar client");
  const tokenManager = TokenManager.getInstance();

  // Get tokens for the account
  let tokens = await tokenManager.getTokens(accountId, userId);

  if (!tokens) {
    throw new Error("No tokens found for account");
  }

  // Check if token is expired or about to expire (within 5 minutes)
  if (tokens.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    tokens = await tokenManager.refreshGoogleTokens(accountId, userId);
    if (!tokens) {
      throw new Error("Failed to refresh tokens");
    }
  }

  const oauth2Client = await createGoogleOAuthClient({
    redirectUrl: `${process.env.NEXTAUTH_URL}/api/auth/callback/google`,
  });

  // Set credentials
  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  // Create calendar client
  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function createGoogleEvent(
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
  const calendar = await getGoogleCalendarClient(accountId, userId);
  const timeZone = useSettingsStore.getState().user.timeZone;

  // Format recurrence rule for Google Calendar
  const recurrence =
    event.isRecurring && event.recurrenceRule
      ? [
          event.recurrenceRule.startsWith("RRULE:")
            ? event.recurrenceRule
            : `RRULE:${event.recurrenceRule}`,
        ]
      : undefined;

  const response = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.allDay ? undefined : event.start.toISOString(),
        date: event.allDay
          ? event.start.toISOString().split("T")[0]
          : undefined,
        timeZone,
      },
      end: {
        dateTime: event.allDay ? undefined : event.end.toISOString(),
        date: event.allDay ? event.end.toISOString().split("T")[0] : undefined,
        timeZone,
      },
      recurrence,
    },
  });

  return response.data;
}

export async function updateGoogleEvent(
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
  const calendar = await getGoogleCalendarClient(accountId, userId);
  const timeZone = useSettingsStore.getState().user.timeZone;

  try {
    // Get the event to check if it's part of a series
    const existingEvent = await calendar.events.get({
      calendarId,
      eventId,
    });

    // For series updates, use the master event ID
    if (event.mode === "series" && existingEvent.data.recurringEventId) {
      // Format recurrence rule for Google Calendar
      const recurrence = event.recurrenceRule
        ? [
            event.recurrenceRule.startsWith("RRULE:")
              ? event.recurrenceRule
              : `RRULE:${event.recurrenceRule}`,
          ]
        : undefined;

      const response = await calendar.events.patch({
        calendarId,
        eventId: existingEvent.data.recurringEventId,
        requestBody: {
          summary: event.title,
          description: event.description,
          location: event.location,
          start: event.start
            ? {
                dateTime: event.allDay ? undefined : event.start.toISOString(),
                date: event.allDay
                  ? event.start.toISOString().split("T")[0]
                  : undefined,
                timeZone,
              }
            : undefined,
          end: event.end
            ? {
                dateTime: event.allDay ? undefined : event.end.toISOString(),
                date: event.allDay
                  ? event.end.toISOString().split("T")[0]
                  : undefined,
                timeZone,
              }
            : undefined,
          recurrence,
        },
      });
      return response.data;
    }

    // For single instance updates
    if (event.mode === "single") {
      const instances = await calendar.events.instances({
        calendarId,
        eventId: existingEvent.data.recurringEventId || eventId,
        timeMin: event.start?.toISOString() || newDate().toISOString(),
        maxResults: 1,
      });

      if (instances.data.items?.[0]) {
        // Update the specific instance
        const response = await calendar.events.patch({
          calendarId,
          eventId: instances.data.items[0].id!,
          requestBody: {
            summary: event.title,
            description: event.description,
            location: event.location,
            start: event.start
              ? {
                  dateTime: event.allDay
                    ? undefined
                    : event.start.toISOString(),
                  date: event.allDay
                    ? event.start.toISOString().split("T")[0]
                    : undefined,
                  timeZone,
                }
              : undefined,
            end: event.end
              ? {
                  dateTime: event.allDay ? undefined : event.end.toISOString(),
                  date: event.allDay
                    ? event.end.toISOString().split("T")[0]
                    : undefined,
                  timeZone,
                }
              : undefined,
          },
        });
        return response.data;
      }
    }

    // If not part of a series or no instance found, update the event directly
    const response = await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: {
        summary: event.title,
        description: event.description,
        location: event.location,
        start: event.start
          ? {
              dateTime: event.allDay ? undefined : event.start.toISOString(),
              date: event.allDay
                ? event.start.toISOString().split("T")[0]
                : undefined,
              timeZone,
            }
          : undefined,
        end: event.end
          ? {
              dateTime: event.allDay ? undefined : event.end.toISOString(),
              date: event.allDay
                ? event.end.toISOString().split("T")[0]
                : undefined,
              timeZone,
            }
          : undefined,
        recurrence: event.recurrenceRule
          ? [
              event.recurrenceRule.startsWith("RRULE:")
                ? event.recurrenceRule
                : `RRULE:${event.recurrenceRule}`,
            ]
          : undefined,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Failed to update Google Calendar event:", error);
    throw error;
  }
}

export async function deleteGoogleEvent(
  accountId: string,
  userId: string,
  calendarId: string,
  eventId: string,
  mode: "single" | "series" = "single"
) {
  const calendar = await getGoogleCalendarClient(accountId, userId);

  try {
    // Get the event to check if it's part of a series
    const event = await calendar.events.get({
      calendarId,
      eventId,
    });

    // For series deletion, use the recurring event ID if available
    if (mode === "series" && event.data.recurringEventId) {
      await calendar.events.delete({
        calendarId,
        eventId: event.data.recurringEventId,
      });
      return;
    }

    // For single instance deletions, we need to get the instance first
    if (mode === "single") {
      const instances = await calendar.events.instances({
        calendarId,
        eventId: event.data.recurringEventId || eventId,
        timeMin: newDate().toISOString(),
        maxResults: 1,
      });

      if (instances.data.items?.[0]) {
        // Delete the specific instance
        await calendar.events.delete({
          calendarId,
          eventId: instances.data.items[0].id!,
        });
        return;
      }
    }

    // If not part of a series or no instance found, delete the event directly
    await calendar.events.delete({
      calendarId,
      eventId,
    });
  } catch (error) {
    console.error("Failed to delete Google Calendar event:", error);
    throw error;
  }
}

export default async function getGoogleEvent(
  accountId: string,
  userId: string,
  calendarId: string,
  eventId: string
) {
  const googleCalendarClient = await getGoogleCalendarClient(accountId, userId);

  try {
    // Get the event
    const eventResponse = await googleCalendarClient.events.get({
      calendarId,
      eventId,
    });
    const event = eventResponse.data;
    console.log("Got event:", {
      id: event.id,
      recurringEventId: event.recurringEventId,
      hasRecurrence: !!event.recurrence,
    });

    // Initialize instances array
    let instances: GoogleEvent[] = [];
    let masterEvent = event;

    // If this is an instance of a recurring event
    if (event.recurringEventId) {
      console.log(
        "This is an instance, fetching master event:",
        event.recurringEventId
      );
      try {
        // Get the master event
        const masterResponse = await googleCalendarClient.events.get({
          calendarId,
          eventId: event.recurringEventId,
        });
        masterEvent = masterResponse.data;
        console.log("Got master event:", {
          id: masterEvent.id,
          hasRecurrence: !!masterEvent.recurrence,
        });
      } catch (error) {
        console.error("Failed to get master event:", error);
        // If we can't get the master event, use the instance
        masterEvent = event;
      }
    }

    // If this is a recurring event (either master or we found the master)
    if (masterEvent.recurrence) {
      console.log("Getting instances for recurring event", masterEvent.id);
      const instancesResponse = await googleCalendarClient.events.instances({
        calendarId,
        eventId: masterEvent.id || "", // Ensure non-null string
        timeMin: newDateFromYMD(newDate().getFullYear(), 0, 1).toISOString(),
        timeMax: newDateFromYMD(
          newDate().getFullYear() + 1,
          0,
          1
        ).toISOString(),
      });
      if (instancesResponse && instancesResponse.data) {
        console.log("Found instances:", instancesResponse.data.items?.length);
        instances = instancesResponse.data.items || [];
      }
    }

    return {
      event: masterEvent,
      instances,
    };
  } catch (error) {
    console.error("Failed to sync Google Calendar event:", error);
    throw error;
  }
}
