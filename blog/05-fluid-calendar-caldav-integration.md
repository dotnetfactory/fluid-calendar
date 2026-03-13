# FluidCalendar: Expanding Calendar Support with CalDAV Integration (Part 5)

After adding support for Google Calendar and Microsoft Outlook, I received numerous requests from users who wanted to connect FluidCalendar to their self-hosted or privacy-focused calendar services. Today, I'm excited to share how I implemented CalDAV integration, which dramatically expands FluidCalendar's compatibility with calendar servers and reinforces its position as a versatile open-source alternative to Motion.

👉 **Missed earlier parts of the journey?**

- [Part 1: FluidCalendar: An Open Source Alternative to Motion](https://medium.com/front-end-weekly/fluid-calendar-an-open-source-alternative-to-motion-part-1-7a5b52bf219d)
- [Part 2: FluidCalendar: Outlook Integration and Enhanced Features](https://medium.com/@eibrahim/fluidcalendar-outlook-integration-and-enhanced-features-part-2-1d3dd2858439)
- [Part 3: FluidCalendar: Task Integration and Intelligent Scheduling](https://medium.com/@eibrahim/fluidcalendar-task-integration-and-intelligent-scheduling-part-3-05b873a3fce0)
- [Part 4: FluidCalendar: Introducing Focus Mode for Deep Work](https://medium.com/front-end-weekly/fluidcalendar-introducing-focus-mode-for-deep-work-part-4-3570ba95589a)

## What is CalDAV and Why It Matters

CalDAV (Calendar Distributed Authoring and Versioning) is an open internet standard that allows calendar clients to access and manage calendar data on remote servers. Unlike proprietary APIs from Google or Microsoft, CalDAV is an open protocol that's supported by numerous calendar service providers and self-hosted solutions, including:

- Fastmail
- NextCloud
- Radicale
- Baikal
- Apple iCloud Calendar
- Synology Calendar
- And many other privacy-focused calendar services

By adding CalDAV support to FluidCalendar, I've significantly expanded its compatibility and given users more freedom to choose where their calendar data lives. Whether you're concerned about privacy, use a self-hosted solution, or simply prefer a specific calendar provider that doesn't have a direct API integration, CalDAV support has you covered.

## The Technical Challenge

Implementing CalDAV support presented several interesting challenges that made this feature particularly complex:

1. **Protocol Complexity**: CalDAV extends WebDAV, which extends HTTP, creating a layered protocol that requires careful implementation
2. **Server Variation**: Different CalDAV servers implement the protocol with slight variations that need special handling
3. **iCalendar Format**: Working with the iCalendar format (RFC 5545) required precise parsing and generation
4. **Recurring Events**: Complex recurrence rules needed special handling for proper expansion and management
5. **Authentication**: Supporting various authentication methods across different servers

Let me walk you through how I tackled these challenges and built a robust CalDAV integration for FluidCalendar.

## Database Schema Enhancements

The first step was expanding our database schema to support CalDAV-specific fields. I modified the Prisma schema with these additions:

```typescript
model ConnectedAccount {
  // Existing fields
  // ...

  // Added fields for CalDAV
  caldavUrl      String?  // Base URL for CalDAV server
  caldavUsername String?  // Username for authentication
  // Note: Password stored in accessToken for consistency
}

model CalendarFeed {
  // Existing fields
  // ...

  // Added fields for CalDAV
  caldavPath     String?  // Path to the specific calendar on the server
  ctag           String?  // For efficient calendar change detection
}
```

This structure allows FluidCalendar to store connection details for CalDAV servers while maintaining consistency with our existing account management system.

## Building the CalDAV Client

The core of the integration is the `CalDAVCalendarService` class, which handles all interactions with CalDAV servers. I chose to use the `tsdav` library as the foundation and built additional functionality on top of it.

```typescript
export class CalDAVCalendarService {
  private client: ExtendedDAVClient | null = null;

  constructor(
    private prisma: PrismaClient,
    private account: ConnectedAccount
  ) {
    // Initialize client when needed
  }

  // Authentication and discovery methods
  private async getClient(): Promise<ExtendedDAVClient> {
    // Initialize and authenticate with the CalDAV server
  }

  // Event operations
  async getEvents(
    start: Date,
    end: Date,
    calendarPath: string
  ): Promise<CalendarEvent[]> {
    // Fetch events from the CalDAV server
  }

  // Synchronization
  async syncCalendar(
    feedId: string,
    calendarPath: string,
    userId: string
  ): Promise<SyncResult> {
    // Synchronize with the server and update the database
  }

  // CRUD operations
  async createEvent(
    calendarPath: string,
    event: CalendarEventInput,
    userId: string
  ): Promise<CalendarEvent> {
    // Create new events on the server
  }

  async updateEvent(
    eventWithFeed: CalendarEventWithFeed,
    calendarPath: string,
    externalEventId: string,
    event: CalendarEventInput,
    mode: "single" | "series",
    userId: string
  ): Promise<CalendarEvent> {
    // Update existing events on the server
  }

  async deleteEvent(
    event: CalendarEventWithFeed,
    calendarPath: string,
    externalEventId: string,
    mode: "single" | "series",
    userId: string
  ): Promise<void> {
    // Delete events from the server
  }

  // Helper methods
  // ...
}
```

The service implements all the necessary CRUD operations and handles synchronization between the local database and the remote CalDAV server.

## Working with iCalendar Format

One of the key challenges was working with the iCalendar format, which is how calendar data is stored and exchanged in CalDAV. I used the `ical.js` library to handle parsing and generation of iCalendar data.

Here's how I convert between FluidCalendar's internal event format and the iCalendar format:

```typescript
private convertToICalendar(event: CalendarEventInput): string {
  // Create a new iCalendar component
  const calendar = new ICAL.Component(['vcalendar', [], []]);
  calendar.updatePropertyWithValue('prodid', '-//FluidCalendar//EN');
  calendar.updatePropertyWithValue('version', '2.0');

  // Create the event component
  const vevent = new ICAL.Component(['vevent', [], []]);
  vevent.updatePropertyWithValue('uid', event.id || crypto.randomUUID());
  vevent.updatePropertyWithValue('summary', event.title);

  if (event.description) {
    vevent.updatePropertyWithValue('description', event.description);
  }

  if (event.location) {
    vevent.updatePropertyWithValue('location', event.location);
  }

  // Handle start and end times with special processing for all-day events
  const dtstart = new ICAL.Property('dtstart');
  const dtend = new ICAL.Property('dtend');

  if (event.allDay) {
    dtstart.setParameter('value', 'date');
    dtend.setParameter('value', 'date');
    // Format dates for all-day events
    // ...
  } else {
    // Set standard date-times
    dtstart.setValue(ICAL.Time.fromJSDate(event.start, false));
    dtend.setValue(ICAL.Time.fromJSDate(event.end, false));
  }

  vevent.addProperty(dtstart);
  vevent.addProperty(dtend);

  // Handle recurring events
  if (event.isRecurring && event.recurrenceRule) {
    // Convert from RRule string format to iCalendar format
    // ...
  }

  calendar.addSubcomponent(vevent);
  return calendar.toString();
}
```

And for parsing iCalendar data into our internal format:

```typescript
function convertVEventToCalendarEvent(vevent: ICAL.Component): CalendarEvent {
  // Extract event properties
  const uid = vevent.getFirstPropertyValue("uid") || crypto.randomUUID();
  const summary = vevent.getFirstPropertyValue("summary");
  const description = vevent.getFirstPropertyValue("description");
  const location = vevent.getFirstPropertyValue("location");

  // Get start and end times
  const dtstart = vevent.getFirstProperty("dtstart");
  const dtend =
    vevent.getFirstProperty("dtend") || vevent.getFirstProperty("duration");

  // Check if this is an all-day event
  const isAllDay = isAllDayEvent(vevent);

  // Process dates, handling all the edge cases
  // ...

  // Detect recurrence information
  const rrule = vevent.getFirstPropertyValue("rrule");
  const isRecurring = !!rrule;
  const recurrenceId = vevent.getFirstPropertyValue("recurrence-id");
  const isInstance = !!recurrenceId;
  const isMaster = isRecurring && !isInstance;

  // Convert to internal event format
  return {
    id: uid,
    feedId: "", // Set later
    externalEventId: uid,
    title: summary ? String(summary) : "Untitled Event",
    description: description ? String(description) : null,
    start: startDate,
    end: endDate,
    location: location ? String(location) : null,
    isRecurring: isMaster,
    recurrenceRule: recurrenceRuleString,
    allDay: isAllDay,
    // ... other fields
  } as CalendarEvent;
}
```

## Handling Recurring Events

Recurring events presented a particular challenge because they needed special handling in several ways:

1. **Expansion**: Converting recurrence rules into specific instances
2. **Storage**: Storing master events and instances correctly
3. **Modification**: Handling changes to single instances vs. the entire series

To expand recurring events, I implemented this approach:

```typescript
private async expandMasterEvent(masterEvent: CalendarEvent): Promise<CalendarEvent[]> {
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
    options.dtstart = masterEvent.start;

    // Create the RRule instance
    const rule = new RRule(options);

    // Get all occurrences between the start and end dates
    const occurrences = rule.between(timeRange.start, timeRange.end, true);

    // Create instance events for each occurrence
    const instanceEvents: CalendarEvent[] = occurrences
      .map((date) => {
        // Calculate the duration of the master event
        const duration = masterEvent.end.getTime() - masterEvent.start.getTime();
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
    // Error handling
    return [];
  }
}
```

## CalDAV Server Compatibility

Different CalDAV servers implement the protocol with slight variations. For example, Fastmail has specific requirements for URL formatting and authentication. I built in special handling for these cases:

```typescript
// For Fastmail compatibility, we'll use a PUT request to a specific URL
const normalizedCalendarPath = calendarPath.endsWith("/")
  ? calendarPath.slice(0, -1)
  : calendarPath;

// Create a URL for the event using the externalEventId
const eventUrl = `${normalizedCalendarPath}/${externalEventId}.ics`;

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

// If that fails, fall back to the standard method
if (response.status < 200 || response.status >= 300) {
  // Fall back to the createObject method
  response = await client.createObject({
    url: calendarPath,
    data: icalData,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "If-None-Match": "*", // Ensures we're creating a new resource
    },
  });
}
```

This dual-method approach ensures compatibility with a wide range of CalDAV servers.

## API Layer and User Interface

To expose the CalDAV functionality to users, I implemented several API endpoints:

```typescript
// Route to discover available CalDAV calendars
export async function GET(request: NextRequest) {
  // Discover and list calendars from the CalDAV server
}

// Route to add a selected CalDAV calendar
export async function POST(request: NextRequest) {
  // Add a calendar to FluidCalendar and perform initial sync
}
```

The calendar discovery flow gives users a smooth experience when connecting their CalDAV accounts:

1. User enters their CalDAV server URL, username, and password
2. FluidCalendar connects to the server and discovers available calendars
3. User selects which calendars to add to FluidCalendar
4. Selected calendars are synchronized and events are loaded
5. FluidCalendar's auto-scheduling system incorporates these events

## Integration with Existing Calendar System

To maintain consistency across the application, I integrated the CalDAV functionality into the existing calendar system:

```typescript
// In the calendar store
if (feed.type === "CALDAV") {
  const response = await fetch("/api/calendar/caldav/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newEvent),
  });

  if (!response.ok) {
    throw new Error("Failed to add event to CalDAV Calendar");
  }

  // Reload from database to get the latest state
  await get().loadFromDatabase();

  // Trigger auto-scheduling after event is created
  const { scheduleAllTasks } = useTaskStore.getState();
  await scheduleAllTasks();
  return;
}
```

This ensures that CalDAV calendars are treated the same way as Google Calendar or Outlook calendars throughout the application.

## Challenges and Solutions

During implementation, I encountered several challenges:

### 1. Server Variations

Different servers implement CalDAV slightly differently. For example:

- Fastmail requires paths to end with `.ics` for individual events
- Some servers prefer PUT requests while others work better with POST
- Authentication methods vary between servers

Solution: I implemented fallback mechanisms and server-specific handling to ensure maximum compatibility.

### 2. Recurrence Rule Handling

iCalendar recurrence rules use a different format than JavaScript libraries like `rrule.js`.

Solution: I wrote bidirectional converters between the two formats:

```typescript
// Convert from RRule string format to iCalendar RRULE component
const rruleValue = event.recurrenceRule;
const rruleProp = new ICAL.Property("rrule");
const rruleObj = {};

rruleValue.split(";").forEach((part) => {
  const [key, value] = part.split("=");
  if (key && value) {
    if (value.includes(",")) {
      rruleObj[key.toLowerCase()] = value.split(",");
    } else if (!isNaN(Number(value))) {
      rruleObj[key.toLowerCase()] = Number(value);
    } else {
      rruleObj[key.toLowerCase()] = value;
    }
  }
});

rruleProp.setValue(rruleObj);
vevent.addProperty(rruleProp);
```

### 3. Performance with Large Calendars

Calendar synchronization can be slow with large calendars containing many recurring events.

Solution: I implemented a time-range based filtering system to only fetch relevant events:

```typescript
private createCalDAVQueryParams(
  calendarPath: string,
  start: Date,
  end: Date,
  useExpand: boolean
): CalendarQueryParams {
  // Create parameters to query only events within a specific time range
  return {
    url: calendarPath,
    props: {
      // ... properties
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
              start: this.formatDateForCalDAV(start),
              end: this.formatDateForCalDAV(end),
            },
          },
        },
      },
    },
    depth: "1",
  };
}
```

## Results and Benefits

Adding CalDAV support to FluidCalendar has brought several benefits:

1. **Increased User Choice**: Users can now connect calendars from virtually any provider
2. **Privacy Control**: Self-hosted calendar solutions give users complete control over their data
3. **Ecosystem Integration**: Better compatibility with the open-source calendar ecosystem
4. **Future-Proofing**: As an open standard, CalDAV ensures long-term compatibility
5. **Feature Parity**: CalDAV calendars work seamlessly with FluidCalendar's auto-scheduling

## Looking Forward

With CalDAV integration, FluidCalendar has taken another significant step toward becoming a complete, open-source alternative to Motion. While most of the essential functionality is now in place, there are still opportunities to enhance the CalDAV support:

1. **Two-way sync improvements**: Optimizing performance for very large calendars
2. **Enhanced server detection**: Automatically detecting server-specific quirks
3. **Advanced recurrence handling**: Better support for complex recurrence patterns
4. **Conflict resolution**: Smarter handling of conflicting calendar changes
5. **Resource support**: Adding support for CalDAV resources (rooms, equipment, etc.)

## Try FluidCalendar Today

If you're interested in trying FluidCalendar with your CalDAV calendars:

1. Check out the open-source version at [https://github.com/dotnetfactory/fluid-calendar](https://github.com/dotnetfactory/fluid-calendar)
2. Try the hosted version at [https://fluidcalendar.com](https://fluidcalendar.com)

I'd love to hear your feedback on the CalDAV integration, especially if you're connecting to a self-hosted calendar server. Which calendars are you using with FluidCalendar? Let me know in the comments!

Follow me on Twitter [@eibrahim](https://x.com/eibrahim) for updates and behind-the-scenes insights into FluidCalendar's development journey.

---

_Are there specific calendar providers you'd like to see supported next in FluidCalendar? Share your thoughts in the comments!_
