# Calendar Integrations

Technical reference for Google Calendar, Outlook, and CalDAV sync.

## Overview

| Provider | Auth Method | Sync Strategy | Incremental | Push (Write) |
|----------|-------------|---------------|-------------|--------------|
| Google | OAuth 2.0 | Full fetch (1yr range) | No (no webhooks) | Yes (GCalPush) |
| Outlook | Azure AD | Delta sync | Yes (deltaLink) | Yes |
| CalDAV | Basic Auth | Full fetch + RRule | No | Yes |

All syncs are **user-triggered** (manual sync button or on-task-change). No background polling.

## Google Calendar

### Files
- `src/app/api/calendar/google/auth/route.ts` - OAuth initiation
- `src/app/api/calendar/google/route.ts` - Callback, feed management, sync
- `src/app/api/calendar/google/events/route.ts` - Event CRUD
- `src/lib/google-calendar.ts` - Client creation, token refresh

### OAuth Flow
1. `GET /api/calendar/google/auth` initiates OAuth with scopes:
   - `calendar`, `calendar.events`, `userinfo.email`, `tasks`
   - `access_type: "offline"` for refresh tokens
2. Callback at `GET /api/calendar/google` exchanges code for tokens
3. Tokens stored via `TokenManager.storeTokens()`
4. Auto-discovers all user calendars, creates CalendarFeed records

### Sync (PUT /api/calendar/google)
- Fetches ALL events from 1 year ago to 1 year ahead
- Paginated via `fetchAllEvents()` (handles nextPageToken)
- Transaction with 30-second timeout
- Handles master events + recurring instances via `masterEvents` map
- Updates `lastSync`, clears errors

### All-Day Event Handling
- **Detection**: `!event.start.dateTime` (only `.date` field present)
- **Storage**: `createAllDayDate()` converts "YYYY-MM-DD" to local midnight
- **End date**: Google uses exclusive end (next day midnight for single-day events)

### Token Refresh
- Auto-refresh if expiring within 5 minutes (`getGoogleCalendarClient()`)
- Uses `TokenManager.refreshGoogleTokens()`

### GCal Push (Tasks to Calendar)
See [scheduling-engine.md](./scheduling-engine.md) > GCal Push Service section.

Task Calendar feed has `autoSync: false` to prevent pulling back pushed events (write-only).

## Outlook

### Files
- `src/app/api/calendar/outlook/route.ts` - OAuth callback
- `src/app/api/calendar/outlook/sync/route.ts` - Sync trigger
- `src/lib/outlook-sync.ts` - Core sync logic (484 lines)
- `src/lib/outlook-calendar.ts` - Client creation

### Delta Sync (Incremental)
- Uses `@odata.deltaLink` token for incremental updates
- On first sync: full fetch
- Subsequent syncs: only changed/deleted events since last deltaLink
- Handles deleted events during delta sync (removes from DB)

### Master/Instance Pattern
- `processMasterEvent()` (lines 290-363):
  - Saves master event with `isMaster: true`
  - Fetches instances via paginated Graph API call
  - Links instances via `masterEventId`

### All-Day Events
- **Detection**: `event.isAllDay` boolean
- **Storage**: Extracts date part only, creates local midnight Date objects
- **No timezone conversion** for all-day events (preserves display date)

### Recurrence
- `convertOutlookRecurrenceToRRule()` converts Outlook pattern to RRULE format
- Stored on master event's `recurrenceRule` field

## CalDAV

### Files
- `src/app/api/calendar/caldav/route.ts` - Account setup
- `src/app/api/calendar/caldav/sync/route.ts` - Sync trigger
- `src/lib/caldav-calendar.ts` - CalDAVCalendarService class

### Auth
- Basic Auth with URL + username + password
- Credentials stored in ConnectedAccount (`caldavUrl`, `caldavUsername`, `accessToken` as password)

### Sync
- Uses `tsdav` library for CalDAV protocol
- `getEvents()`: Fetches master events, then expands recurring locally
- `fetchMasterEvents()`: CalDAV REPORT query with time range
- `expandRecurringEvents()`: Uses `rrule` npm package to generate occurrences

### All-Day Events
- Detected via `DTSTART;VALUE=DATE` parameter (no time component)
- ical.js library handles parsing
- All-day flag preserved during recurrence expansion

## Event Storage (Database)

### CalendarFeed
```
id, name, type (GOOGLE/OUTLOOK/CALDAV/LOCAL)
url (external calendar ID or path)
syncToken (for incremental sync)
lastSync, error
channelId, resourceId (webhook fields - unused)
caldavPath, ctag (CalDAV-specific)
userId, accountId
```

### CalendarEvent
```
id, feedId, externalEventId
title, description, start, end, location
isRecurring, recurrenceRule
allDay, status
isMaster, masterEventId (recurring hierarchy)
recurringEventId (Google's recurring event grouping)
organizer (JSON), attendees (JSON)
```

### Deduplication
- Unique key: `(feedId, externalEventId)`
- On sync: lookup existing, update if found, create if new
- CalDAV uses in-memory `processedUids` Set during sync

## Event Status Values

Calendar events have a `status` field that affects scheduling:

| Status | Effect on Scheduling |
|--------|---------------------|
| `"busy"` / `null` | Blocks scheduling (default) |
| `"free"` | Does NOT block scheduling |
| `"transparent"` | Does NOT block scheduling |
| `"tentative"` | Blocks scheduling (treated as busy) |

Logic in `CalendarServiceImpl.ts:83-85`:
```typescript
if (event.status === "free" || event.status === "transparent") continue;
```

## Sync Triggers

1. **Manual**: User clicks "Sync" button in FeedManager UI
2. **On calendar feed add**: Auto-syncs immediately
3. **After event CRUD**: Reloads from DB + may trigger reschedule
4. **Store action**: `calendar.ts:syncFeed()` and `syncAllFeeds()`

No polling, no webhooks, no background jobs for sync.
