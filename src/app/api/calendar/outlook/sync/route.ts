import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getOutlookCalendarClient,
  convertOutlookRecurrenceToRRule,
} from "@/lib/outlook-calendar";
import { logger } from "@/lib/logger";

export async function GET(_req: NextRequest) {
  return NextResponse.json(
    { error: "Method not allowed. Use POST to sync calendars." },
    { status: 405 }
  );
}

// Helper type for Outlook attendee
interface OutlookAttendee {
  emailAddress: {
    address: string;
    name: string;
  };
  status: {
    response: string;
  };
}

// Shared sync function
async function syncOutlookCalendar(
  client: any,
  feed: { id: string; url: string },
  lastSyncToken?: string | null
) {
  let response;
  let allEvents = [];
  let nextLink = null;

  // Initial request
  response = await client
    .api(`/me/calendars/${feed.url}/events`)
    .header(
      "Prefer",
      'outlook.body-content-type=text; outlook.timezone="UTC"; odata.maxpagesize=999; maxpagesize=999'
    )
    .query({
      $top: 999,
      startDateTime: new Date(new Date().getFullYear() - 5, 0, 1).toISOString(),
      endDateTime: new Date(new Date().getFullYear() + 3, 11, 31).toISOString(),
      $expand: "instances",
      $select:
        "id,subject,body,start,end,location,attendees,recurrence,isAllDay,createdDateTime,lastModifiedDateTime,showAs,type,seriesMasterId,instances",
      $orderby: "createdDateTime desc",
    })
    .get();

  allEvents = response.value;
  nextLink = response["@odata.nextLink"];

  // Handle pagination
  while (nextLink) {
    logger.log("Fetching next page of events", { nextLink });
    response = await client
      .api(nextLink)
      .header(
        "Prefer",
        'outlook.body-content-type=text; outlook.timezone="UTC"; odata.maxpagesize=999; maxpagesize=999'
      )
      .get();
    allEvents = allEvents.concat(response.value);
    nextLink = response["@odata.nextLink"];
  }

  const nextSyncToken = response["@odata.deltaLink"]?.split("deltatoken=")[1];

  logger.log("Retrieved events from Outlook", {
    totalCount: allEvents.length,
    hasRecurring: allEvents.some((e: { recurrence?: any }) => e.recurrence),
    recurringCount: allEvents.filter((e: any) => e.recurrence).length,
    pageCount: allEvents.length / 999,
    nextSyncToken: nextSyncToken ? "present" : "not present",
    dateRange: {
      start: new Date(new Date().getFullYear() - 5, 0, 1).toISOString(),
      end: new Date(new Date().getFullYear() + 3, 11, 31).toISOString(),
    },
    sampleEvent:
      allEvents.length > 0
        ? {
            hasInstances: !!allEvents[0].instances,
            instanceCount: allEvents[0].instances?.length || 0,
            type: allEvents[0].type,
            hasRecurrence: !!allEvents[0].recurrence,
          }
        : null,
  });

  // Process each event
  const processedEventIds = new Set<string>();
  for (const outlookEvent of allEvents) {
    try {
      if (outlookEvent.id) {
        processedEventIds.add(outlookEvent.id);
      }

      // Get instances if this is a recurring event
      let eventWithInstances = [outlookEvent]; // Renamed from allEvents to avoid shadowing
      if (outlookEvent.recurrence) {
        logger.log("Processing recurring event", {
          eventId: outlookEvent.id,
          subject: outlookEvent.subject,
          recurrence: outlookEvent.recurrence,
          hasInstances: !!outlookEvent.instances,
          instanceCount: outlookEvent.instances?.length || 0,
        });

        if (lastSyncToken) {
          // For delta sync, fetch instances separately
          const instancesResponse = await client
            .api(
              `/me/calendars/${feed.url}/events/${outlookEvent.id}/instances`
            )
            .query({
              startDateTime: new Date(
                new Date().getFullYear() - 5,
                0,
                1
              ).toISOString(),
              endDateTime: new Date(
                new Date().getFullYear() + 3,
                11,
                31
              ).toISOString(),
            })
            .get();

          if (instancesResponse.value) {
            eventWithInstances = instancesResponse.value.map(
              (instance: any) => ({
                ...instance,
                recurrence: outlookEvent.recurrence,
                type: "occurrence",
                seriesMasterId: outlookEvent.id,
              })
            );
          }
        } else if (outlookEvent.instances) {
          // For initial sync, instances are already included
          eventWithInstances = outlookEvent.instances.map((instance: any) => ({
            ...instance,
            recurrence: outlookEvent.recurrence,
            type: "occurrence",
            seriesMasterId: outlookEvent.id,
          }));
        }

        logger.log("Processed instances for recurring event", {
          eventId: outlookEvent.id,
          subject: outlookEvent.subject,
          instanceCount: eventWithInstances.length,
        });
      }

      // Process each event and its instances
      for (const event of eventWithInstances) {
        try {
          // Skip master events - we only want to create instances
          if (
            event.type === "seriesMaster" ||
            outlookEvent.type === "seriesMaster"
          ) {
            continue;
          }

          const eventData = {
            feedId: feed.id,
            googleEventId: event.id,
            title: event.subject,
            description: event.body?.content || null,
            start: new Date(event.start.dateTime),
            end: new Date(event.end.dateTime),
            location: event.location?.displayName || null,
            isRecurring: !!event.recurrence || !!event.seriesMasterId,
            isMaster: false,
            recurrenceRule: outlookEvent.recurrence
              ? convertOutlookRecurrenceToRRule(outlookEvent.recurrence)
              : null,
            allDay: event.isAllDay || false,
            status: event.showAs || "busy",
            created: event.createdDateTime
              ? new Date(event.createdDateTime)
              : new Date(),
            lastModified: event.lastModifiedDateTime
              ? new Date(event.lastModifiedDateTime)
              : new Date(),
            sequence: 0,
            organizer: event.isOrganizer
              ? { set: { email: "" } }
              : { set: null },
            attendees: {
              set: event.attendees
                ? event.attendees.map((a: OutlookAttendee) => ({
                    email: a.emailAddress.address,
                    name: a.emailAddress.name,
                    status: a.status.response,
                  }))
                : [],
            },
            masterEventId: null,
            recurringEventId: event.seriesMasterId || null,
          };

          // Find existing event
          const existingEvent = await prisma.calendarEvent.findFirst({
            where: {
              feedId: feed.id,
              googleEventId: event.id,
            },
          });

          if (existingEvent) {
            await prisma.calendarEvent.update({
              where: { id: existingEvent.id },
              data: eventData,
            });
          } else {
            await prisma.calendarEvent.create({
              data: eventData,
            });
          }
        } catch (eventError) {
          logger.log("Failed to process event", {
            eventId: event.id,
            subject: event.subject,
            error: eventError,
          });
        }
      }
    } catch (eventError) {
      logger.log("Failed to process event or its instances", {
        eventId: outlookEvent.id,
        subject: outlookEvent.subject,
        error: eventError,
      });
    }
  }

  return { processedEventIds, nextSyncToken };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accountId, calendarId, name, color } = body;

    if (!accountId || !calendarId) {
      return NextResponse.json(
        { error: "Account ID and Calendar ID are required" },
        { status: 400 }
      );
    }

    // Get the account
    const account = await prisma.connectedAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.provider !== "OUTLOOK") {
      return NextResponse.json(
        { error: "Invalid Outlook account" },
        { status: 400 }
      );
    }

    // Check if calendar already exists
    const existingFeed = await prisma.calendarFeed.findFirst({
      where: {
        type: "OUTLOOK",
        url: calendarId,
        accountId,
      },
    });

    if (existingFeed) {
      return NextResponse.json(existingFeed);
    }

    // Create calendar feed
    const feed = await prisma.calendarFeed.create({
      data: {
        name,
        type: "OUTLOOK",
        url: calendarId,
        color: color || "#3b82f6",
        enabled: true,
        accountId: account.id,
      },
    });

    // Sync events for this calendar
    const client = await getOutlookCalendarClient(accountId);
    await syncOutlookCalendar(client, feed, null);

    return NextResponse.json(feed);
  } catch (error) {
    logger.log("Failed to add Outlook calendar", { error });
    return NextResponse.json(
      { error: "Failed to add calendar" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { feedId } = body;

    logger.log("Starting Outlook calendar sync", { feedId });

    if (!feedId) {
      return NextResponse.json(
        { error: "Calendar feed ID is required" },
        { status: 400 }
      );
    }

    // Get the calendar feed and account
    const feed = await prisma.calendarFeed.findUnique({
      where: { id: feedId },
      include: { account: true },
    });

    if (!feed || !feed.account || feed.type !== "OUTLOOK") {
      logger.log("Invalid Outlook calendar", { feed });
      return NextResponse.json(
        { error: "Invalid Outlook calendar" },
        { status: 400 }
      );
    }

    // Get all existing event IDs for this feed
    const existingEvents = await prisma.calendarEvent.findMany({
      where: { feedId },
      select: { id: true, googleEventId: true },
    });
    const existingEventMap = new Map(
      existingEvents.map((e) => [e.googleEventId, e.id])
    );

    // Get events from Outlook
    const client = await getOutlookCalendarClient(feed.account.id);
    const { processedEventIds, nextSyncToken } = await syncOutlookCalendar(
      client,
      feed,
      feed.syncToken
    );

    // Update the feed's sync token
    if (nextSyncToken) {
      await prisma.calendarFeed.update({
        where: { id: feed.id },
        data: {
          syncToken: nextSyncToken,
        },
      });
    }

    // Delete events that no longer exist in Outlook
    let deletedCount = 0;
    for (const [googleEventId, id] of existingEventMap.entries()) {
      if (googleEventId && !processedEventIds.has(googleEventId)) {
        try {
          await prisma.calendarEvent.delete({
            where: { id },
          });
          deletedCount++;
        } catch (deleteError) {
          logger.log("Failed to delete event", {
            eventId: googleEventId,
            error: deleteError,
          });
        }
      }
    }

    // Update the feed's sync status
    await prisma.calendarFeed.update({
      where: { id: feed.id },
      data: {
        lastSync: new Date(),
      },
    });

    logger.log("Completed Outlook calendar sync", {
      feedId,
      processedEvents: processedEventIds.size,
      deletedEvents: deletedCount,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.log("Failed to sync Outlook calendar", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to sync calendar" },
      { status: 500 }
    );
  }
}
