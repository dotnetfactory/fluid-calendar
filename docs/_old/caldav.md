# CalDAV Integration Plan

This document outlines the plan for adding CalDAV support to FluidCalendar, enabling users to connect to a wide range of calendar servers that support the CalDAV standard (NextCloud, Fastmail, Baikal, Radicale, etc.).

## Current Architecture Overview

Our application currently supports Google Calendar and Outlook Calendar integrations with the following architecture:

1. **Service Interface**: `CalendarService` interface defines the contract for calendar operations
2. **Service Implementation**: `CalendarServiceImpl` implements this interface and handles caching and database operations
3. **Provider-Specific Implementations**: 
   - `google-calendar.ts` for Google Calendar integration
   - `outlook-calendar.ts` for Outlook Calendar integration
4. **Authentication**: `TokenManager` handles OAuth tokens for different providers
5. **Database Schema**: 
   - `ConnectedAccount` stores account credentials
   - `CalendarFeed` represents a calendar source
   - `CalendarEvent` stores calendar events

## CalDAV Technical Background

### What is CalDAV?

CalDAV (Calendar Distributed Authoring and Versioning) is an internet standard for calendar access, defined in RFC 4791. It extends WebDAV (which itself extends HTTP) to provide calendar-specific functionality.

### Key Components

1. **Protocol**: CalDAV uses HTTP methods (GET, PUT, DELETE, PROPFIND, REPORT) for calendar operations
2. **Data Format**: CalDAV uses iCalendar (RFC 5545) as its data format for calendar objects
3. **Authentication**: Typically Basic Auth, but some servers support OAuth
4. **Discovery**: Uses PROPFIND requests to discover available calendars
5. **Sync**: Uses WebDAV sync-collection or time-range filtering for efficient synchronization

### Why iCalendar is Necessary

iCalendar (often abbreviated as iCal) is essential for working with CalDAV because:

1. **Data Format Standard**: CalDAV servers store and exchange calendar data in iCalendar format
2. **Complete Event Information**: iCalendar defines the structure for representing all calendar data
3. **Protocol Requirement**: The CalDAV specification explicitly requires calendar objects to be stored as iCalendar data

## Implementation Plan

### Phase 1: Foundation and Research

- [ ] Research CalDAV client libraries (tsdav, caldav.js, etc.)
- [ ] Select and add the chosen library to the project
- [ ] Add an iCalendar parsing/generation library (ical.js recommended)
- [ ] Update database schema to support CalDAV-specific fields
- [ ] Create basic CalDAV client class structure

### Phase 2: Authentication and Discovery

- [ ] Implement CalDAV authentication (Basic Auth support)
- [ ] Implement calendar discovery functionality
- [ ] Create UI for adding CalDAV accounts
- [ ] Store CalDAV credentials securely
- [ ] Test connection to various CalDAV servers (NextCloud, Fastmail, etc.)

### Phase 3: Read Operations

- [ ] Implement calendar event fetching
- [ ] Convert iCalendar events to internal format
- [ ] Handle recurring events properly
- [ ] Implement efficient sync strategy
- [ ] Integrate with existing caching mechanism
- [ ] Add CalDAV calendars to the calendar selection UI

### Phase 4: Write Operations

- [ ] Implement event creation
- [ ] Implement event updates
- [ ] Implement event deletion
- [ ] Handle recurring event modifications (single vs. series)
- [ ] Convert internal event format to iCalendar
- [ ] Test two-way sync with various CalDAV servers

### Phase 5: Integration and Optimization

- [ ] Integrate with conflict detection system
- [ ] Implement background sync for CalDAV calendars
- [ ] Add comprehensive error handling
- [ ] Optimize performance for large calendars
- [ ] Handle different CalDAV server implementations and quirks
- [ ] Add logging for debugging purposes

### Phase 6: Testing and Documentation

- [ ] Create unit tests for CalDAV functionality
- [ ] Create integration tests with mock CalDAV server
- [ ] Test with real-world CalDAV servers
- [ ] Document CalDAV setup process for users
- [ ] Document supported CalDAV servers and any limitations

## Technical Implementation Details

### Database Schema Updates

```prisma
model ConnectedAccount {
  // Add fields for CalDAV
  caldavUrl      String?  // Base URL for CalDAV server
  caldavUsername String?  // Username for Basic Auth
  // Note: password would be stored in accessToken for consistency
}

model CalendarFeed {
  // Add CalDAV to the type enum: "LOCAL", "GOOGLE", "OUTLOOK", "CALDAV"
  caldavPath     String?  // Path to the specific calendar on the server
}
```

### CalDAV Client Structure

Create a new file `src/lib/caldav-calendar.ts` with the following structure:

```typescript
export class CalDAVCalendarService {
  constructor(private prisma: PrismaClient, private account: ConnectedAccount) {
    // Initialize CalDAV client
  }

  // Authentication and discovery
  async testConnection(): Promise<boolean>
  async discoverCalendars(): Promise<CalDAVCalendar[]>
  
  // Event operations
  async getEvents(start: Date, end: Date, calendarPath: string): Promise<CalendarEvent[]>
  async createEvent(calendarPath: string, event: CalendarEventInput): Promise<CalendarEvent>
  async updateEvent(calendarPath: string, eventId: string, event: CalendarEventInput): Promise<CalendarEvent>
  async deleteEvent(calendarPath: string, eventId: string, mode: "single" | "series"): Promise<void>
  
  // Sync operations
  async syncCalendar(calendarPath: string): Promise<SyncResult>
  
  // Helper methods
  private convertToICalendar(event: CalendarEventInput): string
  private convertFromICalendar(icalData: string): CalendarEvent
}
```

### iCalendar Conversion

Example of converting between internal format and iCalendar:

```typescript
// Internal event to iCalendar
function convertToICalendar(event: CalendarEventInput): string {
  const calendar = new ICAL.Component(['vcalendar', [], []]);
  calendar.updatePropertyWithValue('prodid', '-//FluidCalendar//EN');
  calendar.updatePropertyWithValue('version', '2.0');
  
  const vevent = new ICAL.Component(['vevent', [], []]);
  vevent.updatePropertyWithValue('uid', event.id || crypto.randomUUID());
  vevent.updatePropertyWithValue('summary', event.title);
  
  if (event.description) {
    vevent.updatePropertyWithValue('description', event.description);
  }
  
  // Add start and end times
  const dtstart = new ICAL.Property('dtstart');
  const dtend = new ICAL.Property('dtend');
  
  if (event.allDay) {
    dtstart.setParameter('value', 'date');
    dtend.setParameter('value', 'date');
    // Format as YYYYMMDD
    dtstart.setValue(formatDateToYYYYMMDD(event.start));
    dtend.setValue(formatDateToYYYYMMDD(event.end));
  } else {
    // Set as date-time with timezone
    dtstart.setValue(ICAL.Time.fromJSDate(event.start, false));
    dtend.setValue(ICAL.Time.fromJSDate(event.end, false));
  }
  
  vevent.addProperty(dtstart);
  vevent.addProperty(dtend);
  
  // Handle recurring events
  if (event.isRecurring && event.recurrenceRule) {
    vevent.updatePropertyWithValue('rrule', event.recurrenceRule);
  }
  
  calendar.addSubcomponent(vevent);
  return calendar.toString();
}
```

## Recommended Libraries

1. **tsdav**: A TypeScript library for CalDAV/CardDAV
   - https://github.com/natelindev/tsdav
   - Modern TypeScript support
   - Handles both CalDAV protocol and authentication

2. **ical.js**: For parsing and generating iCalendar data
   - https://github.com/kewisch/ical.js
   - Comprehensive support for iCalendar format
   - Handles recurring events and timezones

## Challenges and Considerations

1. **Server Compatibility**: CalDAV servers can vary in their implementation details
2. **Authentication**: Some servers may require specific authentication methods
3. **Performance**: Efficient sync is crucial for large calendars
4. **Recurring Events**: Complex recurrence rules need careful handling
5. **Error Handling**: Robust error handling for different server behaviors

## Resources

- [RFC 4791: CalDAV](https://datatracker.ietf.org/doc/html/rfc4791)
- [RFC 5545: iCalendar](https://datatracker.ietf.org/doc/html/rfc5545)
- [CalConnect: CalDAV Resources](https://devguide.calconnect.org/CalDAV/) 