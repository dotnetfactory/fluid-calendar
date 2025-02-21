import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";
import { google, calendar_v3 } from "googleapis";
import { TokenManager } from "@/lib/token-manager";
import { getGoogleCalendarClient } from "@/lib/google-calendar";
import { createGoogleOAuthClient } from "@/lib/google";
import { GaxiosError } from "gaxios";
import { newDate, newDateFromYMD } from "@/lib/date-utils";

// Helper function to process recurrence rules
function processRecurrenceRule(
  recurrence: string[] | null | undefined,
  startDate?: Date
): string | undefined {
  if (!recurrence || recurrence.length === 0) return undefined;

  // Find the RRULE (should be the first one starting with RRULE:)
  const rrule = recurrence.find((r) => r.startsWith("RRULE:"));
  if (!rrule) return undefined;

  // For yearly rules, ensure both BYMONTH and BYMONTHDAY are present
  if (rrule.includes("FREQ=YEARLY") && startDate) {
    const hasMonth = rrule.includes("BYMONTH=");
    const hasMonthDay = rrule.includes("BYMONTHDAY=");

    if (!hasMonth || !hasMonthDay) {
      // Start with the base rule
      let parts = rrule.split(";");

      // Remove any existing incomplete parts we'll replace
      parts = parts.filter(
        (part) =>
          !part.startsWith("BYMONTH=") && !part.startsWith("BYMONTHDAY=")
      );

      // Add the complete month and day
      parts.push(`BYMONTH=${startDate.getMonth() + 1}`);
      parts.push(`BYMONTHDAY=${startDate.getDate()}`);

      return parts.join(";");
    }
  }

  return rrule;
}

// Handle Google OAuth callback and account connection
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const codeParam = url.searchParams.get("code");

    if (!codeParam) {
      return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    const oauth2Client = await createGoogleOAuthClient({
      redirectUrl: `${process.env.NEXTAUTH_URL}/api/calendar/google`,
    });

    try {
      // Exchange code for tokens
      const code: string = codeParam;
      const tokenResponse = await oauth2Client.getToken(code);
      const tokens = tokenResponse.tokens;
      oauth2Client.setCredentials(tokens);

      // Get user info to get email
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      if (!userInfo.data.email) {
        return NextResponse.json(
          { error: "Could not get user email" },
          { status: 400 }
        );
      }

      // Store tokens
      const tokenManager = TokenManager.getInstance();
      const accountId = await tokenManager.storeTokens(
        "GOOGLE",
        userInfo.data.email,
        {
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token!,
          expiresAt: newDate(Date.now() + (tokens.expiry_date || 3600 * 1000)),
        }
      );

      // Get list of calendars
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });
      const calendarList = await calendar.calendarList.list();

      // Store calendars
      if (calendarList.data.items) {
        for (const cal of calendarList.data.items) {
          if (cal.id && cal.summary) {
            // Check if calendar feed already exists
            const existingFeed = await prisma.calendarFeed.findFirst({
              where: {
                type: "GOOGLE",
                url: cal.id,
                accountId,
              },
            });

            // Only create if it doesn't exist
            if (!existingFeed) {
              await prisma.calendarFeed.create({
                data: {
                  id: uuidv4(),
                  name: cal.summary,
                  url: cal.id,
                  type: "GOOGLE",
                  color: cal.backgroundColor ?? undefined,
                  accountId,
                },
              });
            }
          }
        }
      }

      return NextResponse.redirect(
        new URL("/settings", process.env.NEXTAUTH_URL!)
      );
    } catch (error) {
      console.error("Failed to exchange code for tokens:", error);
      return NextResponse.json(
        { error: "Failed to authenticate with Google" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Google Calendar OAuth error:", error);
    return NextResponse.json(
      { error: "Failed to authenticate with Google" },
      { status: 500 }
    );
  }
}

// Add a Google Calendar to sync
export async function POST(request: Request) {
  try {
    const { accountId, calendarId, name, color } = await request.json();

    if (!accountId || !calendarId) {
      return NextResponse.json(
        { error: "Account ID and Calendar ID are required" },
        { status: 400 }
      );
    }

    // Check if calendar already exists
    const existingFeed = await prisma.calendarFeed.findFirst({
      where: {
        type: "GOOGLE",
        url: calendarId,
        accountId,
      },
    });

    if (existingFeed) {
      return NextResponse.json(existingFeed);
    }

    // Create calendar client
    const calendar = await getGoogleCalendarClient(accountId);

    // Verify access to the calendar
    try {
      await calendar.calendars.get({
        calendarId,
      });
    } catch (error) {
      console.error("Failed to access calendar:", error);
      return NextResponse.json(
        { error: "Failed to access calendar" },
        { status: 403 }
      );
    }

    // Create calendar feed
    const feed = await prisma.calendarFeed.create({
      data: {
        id: uuidv4(),
        name,
        url: calendarId,
        type: "GOOGLE",
        color,
        accountId,
      },
    });

    // Initial sync of calendar events
    const eventsResponse = await calendar.events.list({
      calendarId,
      timeMin: newDateFromYMD(newDate().getFullYear(), 0, 1).toISOString(),
      timeMax: newDateFromYMD(newDate().getFullYear() + 1, 0, 1).toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = eventsResponse.data.items || [];

    // Store events in database
    if (events.length > 0) {
      await prisma.$transaction(async (tx) => {
        // First, process master events
        const masterEvents = new Map();
        for (const event of events) {
          if (event.recurringEventId) {
            if (!masterEvents.has(event.recurringEventId)) {
              try {
                const masterEvent = await calendar.events.get({
                  calendarId,
                  eventId: event.recurringEventId,
                });
                masterEvents.set(event.recurringEventId, masterEvent.data);
              } catch (error) {
                console.error("Failed to fetch master event:", error);
              }
            }
          }
        }

        // Create or update master events
        for (const [eventId, masterEventData] of masterEvents) {
          const existingMaster = await tx.calendarEvent.findFirst({
            where: {
              feedId: feed.id,
              externalEventId: eventId,
              isMaster: true,
            },
          });

          const masterEventRecord = {
            feedId: feed.id,
            externalEventId: eventId,
            title: masterEventData.summary || "Untitled Event",
            description: masterEventData.description || "",
            start: newDate(
              masterEventData.start?.dateTime ||
                masterEventData.start?.date ||
                ""
            ),
            end: newDate(
              masterEventData.end?.dateTime || masterEventData.end?.date || ""
            ),
            location: masterEventData.location,
            isRecurring: true,
            isMaster: true,
            recurrenceRule: processRecurrenceRule(
              masterEventData.recurrence,
              newDate(
                masterEventData.start?.dateTime ||
                  masterEventData.start?.date ||
                  ""
              )
            ),
            recurringEventId: masterEventData.recurringEventId,
            allDay: !masterEventData.start?.dateTime,
            status: masterEventData.status,
            sequence: masterEventData.sequence,
            created: masterEventData.created
              ? newDate(masterEventData.created)
              : undefined,
            lastModified: masterEventData.updated
              ? newDate(masterEventData.updated)
              : undefined,
            organizer: masterEventData.organizer
              ? {
                  name: masterEventData.organizer.displayName,
                  email: masterEventData.organizer.email,
                }
              : undefined,
            attendees: masterEventData.attendees?.map(
              (a: calendar_v3.Schema$EventAttendee) => ({
                name: a.displayName,
                email: a.email,
                status: a.responseStatus,
              })
            ),
          };

          if (existingMaster) {
            await tx.calendarEvent.update({
              where: { id: existingMaster.id },
              data: masterEventRecord,
            });
          } else {
            await tx.calendarEvent.create({
              data: masterEventRecord,
            });
          }
        }

        // Create or update instances
        for (const event of events) {
          const masterEvent = event.recurringEventId
            ? await tx.calendarEvent.findFirst({
                where: {
                  feedId: feed.id,
                  externalEventId: event.recurringEventId,
                  isMaster: true,
                },
              })
            : null;

          const eventRecord = {
            feedId: feed.id,
            externalEventId: event.id,
            title: event.summary || "Untitled Event",
            description: event.description || "",
            start: newDate(event.start?.dateTime || event.start?.date || ""),
            end: newDate(event.end?.dateTime || event.end?.date || ""),
            location: event.location,
            isRecurring: !!event.recurringEventId,
            isMaster: false,
            masterEventId: masterEvent?.id,
            recurringEventId: event.recurringEventId,
            recurrenceRule: masterEvent
              ? undefined
              : processRecurrenceRule(
                  event.recurrence,
                  event.start
                    ? newDate(event.start?.dateTime || event.start?.date || "")
                    : undefined
                ),
            allDay: event.start ? !event.start.dateTime : false,
            status: event.status,
            sequence: event.sequence,
            created: event.created ? newDate(event.created) : undefined,
            lastModified: event.updated ? newDate(event.updated) : undefined,
            organizer: event.organizer
              ? {
                  name: event.organizer.displayName,
                  email: event.organizer.email,
                }
              : undefined,
            attendees: event.attendees?.map((a) => ({
              name: a.displayName,
              email: a.email,
              status: a.responseStatus,
            })),
          };

          const existingEvent = await tx.calendarEvent.findFirst({
            where: {
              feedId: feed.id,
              externalEventId: event.id,
            },
          });

          if (existingEvent) {
            await tx.calendarEvent.update({
              where: { id: existingEvent.id },
              data: eventRecord,
            });
          } else {
            await tx.calendarEvent.create({
              data: eventRecord,
            });
          }
        }
      });
    }

    return NextResponse.json(feed);
  } catch (error) {
    console.error("Failed to add calendar:", error);
    return NextResponse.json(
      { error: "Failed to add calendar" },
      { status: 500 }
    );
  }
}

// Sync specific calendar
export async function PUT(request: Request) {
  try {
    const { feedId } = await request.json();
    console.log("Syncing calendar feed:", feedId);

    // Get the calendar feed with account info
    const feed = await prisma.calendarFeed.findUnique({
      where: { id: feedId },
      include: { account: true },
    });

    if (!feed || feed.type !== "GOOGLE" || !feed.url || !feed.accountId) {
      return NextResponse.json(
        { error: "Calendar not found or invalid" },
        { status: 404 }
      );
    }

    // Create calendar client using account ID
    const googleCalendarClient = await getGoogleCalendarClient(feed.accountId);
    console.log("Fetching events from Google Calendar:", feed.url);

    // Fetch events from Google Calendar
    const eventsResponse = await googleCalendarClient.events.list({
      calendarId: feed.url,
      timeMin: newDateFromYMD(newDate().getFullYear(), 0, 1).toISOString(),
      timeMax: newDateFromYMD(newDate().getFullYear() + 1, 0, 1).toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    //events sorted by master events first
    const events = eventsResponse.data.items || [];

    console.log(`Found ${events.length} events in Google Calendar`);

    // Pre-fetch all master events for recurring events
    const recurringEvents = events.filter(
      (event) =>
        event.recurringEventId && typeof event.recurringEventId === "string"
    );
    const masterEvents = new Map<string, string[]>();

    for (const event of recurringEvents) {
      const eventId = event.recurringEventId;
      if (
        eventId &&
        !masterEvents.has(eventId) &&
        typeof eventId === "string" &&
        feed.url
      ) {
        try {
          const masterEvent = await googleCalendarClient.events.get({
            calendarId: feed.url as string,
            eventId,
          });
          console.log("Master event", masterEvent);

          const recurrence = masterEvent.data?.recurrence;
          if (Array.isArray(recurrence)) {
            masterEvents.set(eventId, recurrence);
          }
        } catch (error) {
          console.error("Failed to fetch master event:", error);
        }
      }
    }

    // Now perform database operations in transaction
    await prisma.$transaction(async (tx) => {
      console.log("Deleting existing events");
      await tx.calendarEvent.deleteMany({
        where: { feedId },
      });

      // Create new events
      for (const event of events) {
        if (!event.start?.dateTime && !event.start?.date) continue;

        // Get recurrence rule from pre-fetched master events
        if (event.recurringEventId) {
          event.recurrence = masterEvents.get(event.recurringEventId);
        }

        await tx.calendarEvent.create({
          data: {
            id: event.id || undefined,
            feedId: feed.id,
            externalEventId: event.id,
            title: event.summary || "Untitled Event",
            description: event.description || "",
            start: newDate(event.start.dateTime || event.start.date || ""),
            end: newDate(event.end?.dateTime || event.end?.date || ""),
            location: event.location,
            isRecurring: !!event.recurringEventId || !!event.recurrence,
            recurringEventId: event.recurringEventId,
            recurrenceRule: processRecurrenceRule(
              event.recurrence,
              event.start
                ? newDate(event.start?.dateTime || event.start?.date || "")
                : undefined
            ),
            allDay: event.start ? !event.start.dateTime : false,
            status: event.status,
            sequence: event.sequence,
            created: event.created ? newDate(event.created) : undefined,
            lastModified: event.updated ? newDate(event.updated) : undefined,
            organizer: event.organizer
              ? {
                  name: event.organizer.displayName,
                  email: event.organizer.email,
                }
              : undefined,
            attendees: event.attendees?.map(
              (a: calendar_v3.Schema$EventAttendee) => ({
                name: a.displayName,
                email: a.email,
                status: a.responseStatus,
              })
            ),
          },
        });
      }

      // Update feed sync status
      await tx.calendarFeed.update({
        where: { id: feedId },
        data: {
          lastSync: newDate(),
          error: null,
        },
      });
    });

    console.log("Successfully synced calendar:", feedId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Failed to sync Google calendar:", error);

    // Check if it's an auth error
    if (error instanceof GaxiosError && Number(error.code) === 401) {
      return NextResponse.json(
        { error: "Authentication failed. Please try signing in again." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to sync calendar" },
      { status: 500 }
    );
  }
}
