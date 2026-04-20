# Database Schema Reference

Prisma ORM with PostgreSQL. Schema at `prisma/schema.prisma`.

## Entity Relationship Overview

```
User
 ├── CalendarFeed[] ──── CalendarEvent[]
 ├── Task[] ──── Tag[] (many-to-many)
 │    ├── TaskDependency[] (self-referential)
 │    └── TaskChange[]
 ├── Project[] ──── TaskListMapping[]
 ├── Schedule[] ──── ScheduleTimeBlock[]
 ├── Area[]
 ├── DayBlock[]
 ├── TaskProvider[] ──── TaskListMapping[]
 ├── ConnectedAccount[]
 ├── AutoScheduleSettings (1:1)
 ├── UserSettings (1:1)
 ├── CalendarSettings (1:1)
 ├── NotificationSettings (1:1)
 ├── IntegrationSettings (1:1)
 ├── DataSettings (1:1)
 └── Subscription (1:1)
```

## Core Models

### User
Central entity. All data is user-scoped.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | Primary key |
| email | String (unique) | Login identifier |
| role | String | "user" or "admin" |
| name, image | String? | Profile info |

### Task
The main work unit. Combines internal task data with scheduling and sync fields.

| Field | Type | Purpose |
|-------|------|---------|
| **Identity** | | |
| id | String (cuid) | Primary key |
| title | String | Display name |
| description | String? | Details |
| status | String | "todo", "in_progress", "completed" |
| **Time Management** | | |
| dueDate | DateTime? | Hard deadline |
| startDate | DateTime? | When task becomes schedulable |
| duration | Int? | Estimated minutes |
| priority | String? | "high", "medium", "low", "none" |
| energyLevel | String? | "high", "medium", "low" |
| preferredTime | String? | "morning", "afternoon", "evening" |
| **Auto-Scheduling** | | |
| isAutoScheduled | Boolean | Eligible for scheduling |
| scheduleLocked | Boolean | Immovable (blocks time for others) |
| scheduledStart | DateTime? | Assigned start time |
| scheduledEnd | DateTime? | Assigned end time |
| scheduleScore | Float? | Quality of current placement |
| lastScheduled | DateTime? | When last scheduled |
| postponedUntil | DateTime? | Temporarily skip until this time |
| **Blocking** | | |
| isBlocked | Boolean | Excluded from scheduling |
| blockedReason | String? | Why blocked |
| **GCal Push** | | |
| gcalEventId | String? | Event ID in Google Calendar |
| gcalFeedId | String? | Target calendar feed |
| gcalSyncStatus | String? | "pending", "synced", "error" |
| **External Sync** | | |
| externalTaskId | String? | ID in external system |
| source | String? | "omnifocus", "google", "outlook" |
| lastSyncedAt | DateTime? | Last sync timestamp |
| externalListId | String? | External list/folder |
| externalCreatedAt | DateTime? | Created in external system |
| externalUpdatedAt | DateTime? | Modified in external system |
| syncStatus | String? | "synced", "pending", "error" |
| syncHash | String? | Change detection |
| skipSync | Boolean | Opt out of sync |
| **Recurrence** | | |
| isRecurring | Boolean | Repeating task |
| recurrenceRule | String? | RRULE format |
| lastCompletedDate | DateTime? | Last completion |
| completedAt | DateTime? | Current completion |
| **Relations** | | |
| projectId | String? | Parent project |
| scheduleId | String? | Assigned schedule |
| userId | String? | Owner |
| tags | Tag[] | Many-to-many |

**Key indexes**: status, dueDate, startDate, priority, isAutoScheduled, scheduledStart+End, externalTaskId+source, gcalEventId

### Schedule
Defines when work can be scheduled. Multiple schedules per user.

| Field | Type | Purpose |
|-------|------|---------|
| id | String (cuid) | Primary key |
| name | String | Display name (unique per user) |
| timezone | String | IANA timezone |
| isSystem | Boolean | True = 24/7 fallback schedule |
| selectedCalendars | String (JSON) | Which calendars to check for conflicts |
| bufferMinutes | Int | Buffer between tasks (default 15) |
| highEnergyStart/End | Int? | Hour range for high energy |
| mediumEnergyStart/End | Int? | Hour range for medium energy |
| lowEnergyStart/End | Int? | Hour range for low energy |
| color | String? | UI display color |

### ScheduleTimeBlock
Defines available hours per day-of-week within a Schedule.

| Field | Type | Purpose |
|-------|------|---------|
| scheduleId | String | Parent schedule |
| dayOfWeek | Int | 0=Sunday through 6=Saturday |
| startHour | Int | Block start (0-23) |
| startMinute | Int | Minutes (default 0) |
| endHour | Int | Block end (0-23) |
| endMinute | Int | Minutes (default 0) |

Multiple blocks per day allowed (e.g., 9-12 and 13-17 for lunch break).

### DayBlock
Blocks scheduling for a full or partial day.

| Field | Type | Purpose |
|-------|------|---------|
| userId | String | Owner |
| date | DateTime | The day (midnight UTC) |
| blockFrom | DateTime? | null = full day, otherwise block from this time |

**Unique**: (userId, date) - one block per user per day.

### Project
Groups tasks. Maps to external lists via TaskListMapping.

| Field | Type | Purpose |
|-------|------|---------|
| name | String | Display name |
| status | String | "active", "archived" |
| externalId | String? | External system ID |
| externalSource | String? | Which provider |
| areaId | String? | Parent area |
| scheduleId | String? | Default schedule for tasks |

### Area
Groups projects. Inheritable schedule.

| Field | Type | Purpose |
|-------|------|---------|
| name | String | Display name (unique per user) |
| icon | String? | Emoji/icon |
| color | String? | Display color |
| scheduleId | String? | Default schedule for contained projects |

### CalendarFeed
A connected calendar source.

| Field | Type | Purpose |
|-------|------|---------|
| type | String | "GOOGLE", "OUTLOOK", "CALDAV", "LOCAL" |
| url | String? | External calendar ID/path |
| enabled | Boolean | Active for display |
| autoSync | Boolean | (field exists, not actively used) |
| syncInterval | Int | Minutes (field exists, not actively used) |
| syncToken | String? | Incremental sync token (Outlook delta) |
| lastSync | DateTime? | Last sync timestamp |
| caldavPath | String? | CalDAV calendar path |
| ctag | String? | CalDAV change tag |
| accountId | String? | Parent ConnectedAccount |

### CalendarEvent
Individual calendar events.

| Field | Type | Purpose |
|-------|------|---------|
| feedId | String | Parent CalendarFeed |
| externalEventId | String? | ID in external system |
| title, description, location | String? | Event details |
| start, end | DateTime | Time range |
| allDay | Boolean | All-day event flag |
| status | String? | "busy", "free", "transparent", etc. |
| isRecurring | Boolean | Part of a series |
| recurrenceRule | String? | RRULE on master events |
| isMaster | Boolean | Recurring series master |
| masterEventId | String? | Link instance to master |

### TaskChange
Change tracking for sync.

| Field | Type | Purpose |
|-------|------|---------|
| taskId | String? | Changed task (null if deleted) |
| changeType | String | "CREATE", "UPDATE", "DELETE" |
| changeData | Json? | Field deltas |
| changeSource | String? | "user", "omnifocus" (echo prevention) |
| synced | Boolean | Acknowledged by external system |
| timestamp | DateTime | When change occurred |
| mappingId | String? | Which list mapping |

### TaskProvider
Connected task account.

| Field | Type | Purpose |
|-------|------|---------|
| type | String | "OUTLOOK", "GOOGLE" |
| syncInterval | String | "hourly", "daily", "manual" |
| accountId | String? | Parent ConnectedAccount |
| defaultProjectId | String? | Default project for imported tasks |

### TaskListMapping
Links external list to internal project.

| Field | Type | Purpose |
|-------|------|---------|
| providerId | String | Parent TaskProvider |
| projectId | String | FC Project |
| externalListId | String | External list ID |
| direction | String | "incoming", "outgoing", "bidirectional" |
| isAutoScheduled | Boolean | Auto-schedule imported tasks |

## Settings Models (1:1 per User)

### AutoScheduleSettings
Global scheduling preferences.

| Field | Purpose |
|-------|---------|
| workDays | JSON array [0-6] of active days |
| workHourStart/End | Hour range (0-23) |
| selectedCalendars | JSON array of calendar IDs to check |
| bufferMinutes | Default buffer (15) |
| highEnergyStart/End | Energy window hours |
| mediumEnergyStart/End | Energy window hours |
| lowEnergyStart/End | Energy window hours |
| groupByProject | Cluster same-project tasks |

### CalendarSettings
Calendar display and behavior.

| Field | Purpose |
|-------|---------|
| taskCalendarId | Where to push scheduled tasks (GCal) |
| workingHoursStart/End | Display hours (string "HH:MM") |
| workingHoursDays | JSON array of working days |
| defaultDuration | Minutes for new events (60) |
| slotDuration | Grid resolution: 15, 30, or 60 min |

### ConnectedAccount
OAuth tokens for external services.

| Field | Purpose |
|-------|---------|
| provider | "GOOGLE", "OUTLOOK", "CALDAV" |
| email | Account email |
| accessToken | Current token |
| refreshToken | For token refresh |
| expiresAt | Token expiration |
| caldavUrl/Username | CalDAV-specific |

**Unique**: (userId, provider, email)

## Indexes

Performance-critical queries use composite indexes:
- `Task(externalTaskId, source)` - sync lookups
- `Task(scheduledStart, scheduledEnd)` - conflict detection
- `Task(isAutoScheduled)` - scheduling queries
- `CalendarEvent(start, end)` - time range queries
- `CalendarEvent(feedId)` - per-calendar queries
- `TaskChange(synced, timestamp)` - unsynced change queries
- `DayBlock(userId, date)` - day block lookups
