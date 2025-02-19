import { Client } from "@microsoft/microsoft-graph-client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { convertOutlookRecurrenceToRRule } from "@/lib/outlook-calendar";
import type { Prisma } from "@prisma/client";

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
  isAllDay?: boolean;
  showAs?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  isOrganizer?: boolean;
  attendees?: OutlookAttendee[];
  seriesMasterId?: string;
}
const now = new Date();
const timeMin = new Date(now.getFullYear() - 1, 0, 1); // 2 years ago, January 1st
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
    externalEventId: event.id,
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
  eventData: Prisma.CalendarEventCreateInput | Prisma.CalendarEventUpdateInput,
  feedId: string,
  externalEventId: string,
  isMaster: boolean = false
) {
  const existingEvent = await prisma.calendarEvent.findFirst({
    where: {
      feedId,
      externalEventId,
      ...(isMaster ? { isMaster: true } : {}),
    },
  });

  if (existingEvent) {
    return await prisma.calendarEvent.update({
      where: { id: existingEvent.id },
      data: eventData as Prisma.CalendarEventUpdateInput,
    });
  }

  return await prisma.calendarEvent.create({
    data: eventData as Prisma.CalendarEventCreateInput,
  });
}

// Helper to fetch all events from Outlook with pagination
export async function fetchAllEvents(
  client: Client,
  calendarId: string,
  syncToken?: string | null,
  forceFullSync?: boolean
) {
  let allEvents = [];
  let nextLink = null;

  // Initial request - use delta query if sync token is provided
  const apiPath = `/me/calendars/${calendarId}/calendarView/delta`;
  const queryParams = [];

  // Always include startDateTime and endDateTime as required by the API

  if (syncToken && !forceFullSync) {
    logger.log("Using delta query for incremental sync");
    queryParams.push(`$deltatoken=${syncToken}`);
  } else {
    queryParams.push(`startDateTime=${timeMin.toISOString()}`);
    queryParams.push(`endDateTime=${timeMax.toISOString()}`);
  }

  let response = await client
    .api(apiPath + (queryParams.length > 0 ? `?${queryParams.join("&")}` : ""))
    .header("Prefer", `odata.maxpagesize=${PAGE_SIZE}`)
    .get();

  allEvents = response.value;
  nextLink = response["@odata.nextLink"];
  let deltaLink = response["@odata.deltaLink"]; // Track deltaLink from first response

  // Handle pagination
  while (nextLink) {
    logger.log("Fetching next page of events", { nextLink });
    response = await client
      .api(nextLink)
      .header("Prefer", `odata.maxpagesize=${PAGE_SIZE}`)
      .get();
    allEvents = allEvents.concat(response.value);
    nextLink = response["@odata.nextLink"];

    // Update deltaLink if present in this response
    if (response["@odata.deltaLink"]) {
      deltaLink = response["@odata.deltaLink"];
    }
  }

  logger.log("Sync completed", {
    totalEvents: allEvents.length,
    hasDeltaLink: !!deltaLink,
    deltaLink,
  });

  // For delta query, the response includes information about deleted events
  const deletedEvents = allEvents.filter(
    (event: OutlookEvent & { "@removed"?: boolean }) => event["@removed"]
  );
  const activeEvents = allEvents.filter(
    (event: OutlookEvent & { "@removed"?: boolean }) => !event["@removed"]
  );

  return {
    events: activeEvents,
    deletedEventIds: deletedEvents.map((event: OutlookEvent) => event.id),
    nextSyncToken: deltaLink?.split("deltatoken=")[1],
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
    // Create master event data
    const masterEventData = {
      ...createBaseEventData(masterEvent, feed.id, true, true),
      recurrenceRule: masterEvent.recurrence
        ? convertOutlookRecurrenceToRRule(masterEvent.recurrence)
        : null,
      masterEventId: null,
      recurringEventId: null,
    };

    // Save master event
    const savedMaster = await saveEventToDatabase(
      masterEventData,
      feed.id,
      masterEvent.id,
      true
    );
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
          masterEventId: savedMaster.id,
        };

        await saveEventToDatabase(instanceData, feed.id, instance.id, false);
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

export async function syncOutlookCalendar(
  client: Client,
  feed: { id: string; url: string },
  lastSyncToken?: string | null,
  forceFullSync?: boolean
) {
  // Fetch all events
  const {
    events: allEvents,
    deletedEventIds,
    nextSyncToken,
  } = await fetchAllEvents(client, feed.url, lastSyncToken, forceFullSync);
  logger.log("Fetched events from Outlook", {
    totalCount: allEvents.length,
    deletedEventsCount: deletedEventIds?.length || 0,
    nextSyncToken: nextSyncToken ? "present" : "not present",
  });
  if (forceFullSync) {
    // delete all events from the database
    await prisma.calendarEvent.deleteMany({
      where: {
        feedId: feed.id,
      },
    });
  }

  // Handle deleted events first if this is a delta sync
  if (lastSyncToken && deletedEventIds?.length > 0) {
    for (const eventId of deletedEventIds) {
      try {
        // Find and delete the event from our database
        const existingEvent = await prisma.calendarEvent.findFirst({
          where: {
            feedId: feed.id,
            externalEventId: eventId,
          },
        });
        if (existingEvent) {
          await prisma.calendarEvent.delete({
            where: { id: existingEvent.id },
          });
        }
      } catch (error) {
        logger.log("Failed to delete event", {
          eventId,
          error,
        });
      }
    }
  }

  // First, collect master events and non-recurring events
  const masterEvents = new Map();
  const nonRecurringEvents = [];

  for (const event of allEvents) {
    if (event.recurrence) {
      masterEvents.set(event.id, event);
    } else if (!event.seriesMasterId) {
      nonRecurringEvents.push(event);
    }
  }

  logger.log("Retrieved events from Outlook", {
    totalCount: allEvents.length,
    masterEventsCount: masterEvents.size,
    nonRecurringCount: nonRecurringEvents.length,
    deletedEventsCount: deletedEventIds?.length || 0,
    nextSyncToken: nextSyncToken ? "present" : "not present",
  });

  // Process each event
  const processedEventIds = new Set<string>();

  // First, process non-recurring events
  for (const event of nonRecurringEvents) {
    try {
      processedEventIds.add(event.id);

      const eventData = {
        ...createBaseEventData(event, feed.id, false, false),
        recurrenceRule: null,
        masterEventId: null,
        recurringEventId: null,
      };

      await saveEventToDatabase(eventData, feed.id, event.id);
    } catch (error) {
      logger.log("Failed to process non-recurring event", {
        eventId: event.id,
        subject: event.subject,
        error,
      });
    }
  }

  // Then, process recurring events
  for (const [, masterEvent] of masterEvents) {
    const processedIds = await processMasterEvent(client, masterEvent, feed);
    processedIds.forEach((id) => processedEventIds.add(id));
  }

  return { processedEventIds, nextSyncToken };
}
