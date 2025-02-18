import { Client } from "@microsoft/microsoft-graph-client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { convertOutlookRecurrenceToRRule } from "@/lib/outlook-calendar";

interface OutlookAttendee {
  emailAddress: {
    address: string;
    name: string;
  };
  status: {
    response: string;
  };
}

interface OutlookEvent {
  id: string;
  subject?: string;
  body?: {
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
  recurrence?: any;
  isAllDay?: boolean;
  showAs?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  isOrganizer?: boolean;
  attendees?: OutlookAttendee[];
  seriesMasterId?: string;
}
const now = new Date();
const timeMin = new Date(now.getFullYear() - 2, 0, 1); // 2 years ago, January 1st
const timeMax = new Date(now.getFullYear() + 1, 11, 31); // End of next year
const PAGE_SIZE = 200;

// Helper to convert a datetime string and timezone to UTC Date
function convertToUTC(dateTimeString: string, timeZone: string): Date {
  // Create a date in the original timezone
  const originalDate = new Date(dateTimeString);

  // Get the UTC timestamp while respecting the original timezone
  const utcDate = new Date(
    originalDate.toLocaleString("en-US", {
      timeZone: timeZone,
    })
  );

  // Adjust for timezone offset
  const offset = originalDate.getTime() - utcDate.getTime();
  return new Date(originalDate.getTime() + offset);
}

// Helper to create base event data shared between master and instance events
export function createBaseEventData(
  event: OutlookEvent,
  feedId: string,
  isRecurring: boolean,
  isMaster: boolean
) {
  return {
    feedId,
    googleEventId: event.id,
    title: event.subject || "Untitled Event",
    description: event.body?.content || null,
    start: convertToUTC(event.start.dateTime, event.start.timeZone),
    end: convertToUTC(event.end.dateTime, event.end.timeZone),
    location: event.location?.displayName || null,
    isRecurring,
    isMaster,
    allDay: event.isAllDay || false,
    status: event.showAs || "busy",
    created: event.createdDateTime
      ? new Date(event.createdDateTime)
      : new Date(),
    lastModified: event.lastModifiedDateTime
      ? new Date(event.lastModifiedDateTime)
      : new Date(),
    sequence: 0,
    organizer: event.isOrganizer ? { set: { email: "" } } : { set: null },
    attendees: {
      set: event.attendees
        ? event.attendees.map((a: OutlookAttendee) => ({
            email: a.emailAddress.address,
            name: a.emailAddress.name,
            status: a.status.response,
          }))
        : [],
    },
  };
}

// Helper to save an event to the database
export async function saveEventToDatabase(
  eventData: any,
  feedId: string,
  googleEventId: string,
  isMaster: boolean = false
) {
  const existingEvent = await prisma.calendarEvent.findFirst({
    where: {
      feedId,
      googleEventId,
      ...(isMaster ? { isMaster: true } : {}),
    },
  });

  if (existingEvent) {
    return await prisma.calendarEvent.update({
      where: { id: existingEvent.id },
      data: eventData,
    });
  }

  return await prisma.calendarEvent.create({
    data: eventData,
  });
}

// Helper to fetch all events from Outlook with pagination
export async function fetchAllEvents(client: Client, calendarId: string) {
  let allEvents = [];
  let nextLink = null;

  // Initial request
  let response = await client
    .api(`/me/calendars/${calendarId}/events`)
    .filter(
      `start/dateTime ge '${timeMin.toISOString()}' and end/dateTime le '${timeMax.toISOString()}'`
    )
    .select("id,subject,start,end,body,location,recurrence,seriesMasterId")
    .orderby("start/dateTime")
    .top(PAGE_SIZE)
    .get();

  allEvents = response.value;
  nextLink = response["@odata.nextLink"];

  // Handle pagination
  while (nextLink) {
    logger.log("Fetching next page of events", { nextLink });
    response = await client.api(nextLink).get();
    allEvents = allEvents.concat(response.value);
    nextLink = response["@odata.nextLink"];
  }

  return {
    events: allEvents,
    nextSyncToken: response["@odata.deltaLink"]?.split("deltatoken=")[1],
  };
}

// Helper to fetch instances for a recurring event
export async function fetchEventInstances(
  client: Client,
  calendarId: string,
  masterId: string
) {
  let allInstances = [];
  let nextLink = null;

  // Initial request
  let response = await client
    .api(`/me/calendars/${calendarId}/events/${masterId}/instances`)
    .query({
      startDateTime: timeMin.toISOString(),
      endDateTime: timeMax.toISOString(),
    })
    .select("id,subject,start,end,body,location,seriesMasterId")
    .orderby("start/dateTime")
    .top(PAGE_SIZE)
    .get();

  allInstances = response.value;
  nextLink = response["@odata.nextLink"];

  // Handle pagination
  while (nextLink) {
    logger.log("Fetching next page of instances", { nextLink });
    response = await client.api(nextLink).get();
    allInstances = allInstances.concat(response.value);
    nextLink = response["@odata.nextLink"];
  }

  return allInstances;
}

// Helper to process a master event and its instances
export async function processMasterEvent(
  client: Client,
  masterEvent: OutlookEvent,
  feed: { id: string; url: string }
) {
  const processedIds = new Set<string>();
  processedIds.add(masterEvent.id);

  try {
    // Fetch and process instances
    const instances = await fetchEventInstances(
      client,
      feed.url,
      masterEvent.id
    );

    // Process each instance
    for (const instance of instances) {
      try {
        processedIds.add(instance.id);

        const instanceData = {
          ...createBaseEventData(instance, feed.id, true, false),
          recurrenceRule: masterEvent.recurrence
            ? convertOutlookRecurrenceToRRule(masterEvent.recurrence)
            : null,
          recurringEventId: masterEvent.id,
        };

        await saveEventToDatabase(instanceData, feed.id, instance.id);
      } catch (error) {
        logger.log("Failed to process instance", {
          instanceId: instance.id,
          subject: instance.subject,
          error,
        });
      }
    }
  } catch (error) {
    logger.log("Failed to process master event", {
      masterId: masterEvent.id,
      subject: masterEvent.subject,
      error,
    });
  }

  return processedIds;
}
