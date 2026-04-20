# FluidCalendar - Technical Summary

> Reference document for development, debugging, and feature work.
> Points to detailed docs and source files for each subsystem.

## Architecture Overview

FluidCalendar is a **Next.js 15 (App Router)** application with:
- **Frontend**: React 19, Zustand state management, FullCalendar UI, Tailwind CSS
- **Backend**: Next.js API routes, Prisma ORM, PostgreSQL
- **Scheduling Engine**: Custom multi-factor scoring algorithm
- **Calendar Sync**: Google Calendar, Outlook, CalDAV (read + write)
- **Task Sync**: OmniFocus (bidirectional), Google Tasks, Outlook Tasks
- **Auth**: NextAuth v4 (JWT strategy) with Google OAuth, Azure AD, and credentials
- **Deployment**: Docker (standalone), LaunchAgent on Mac Studio for local use

## Process Flow Diagram

```
                          USER INTERACTION
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
     [Calendar UI]      [Task Panel]       [Settings UI]
     WeekView.tsx       TaskList.tsx        TaskSyncSettings.tsx
            │                  │                  │
            ▼                  ▼                  ▼
     ┌─────────────────────────────────────────────────┐
     │              ZUSTAND STORES                      │
     │  calendar.ts  │  task.ts  │  settings.ts        │
     └───────┬───────────┬──────────────┬──────────────┘
             │           │              │
             ▼           ▼              ▼
     ┌─────────────────────────────────────────────────┐
     │              NEXT.JS API ROUTES                  │
     │  /api/calendar/*  │  /api/tasks/*  │  /api/sync/*│
     └───────┬───────────────┬──────────────┬──────────┘
             │               │              │
             ▼               ▼              ▼
     ┌───────────────┐  ┌────────────┐  ┌──────────────┐
     │ CALENDAR SYNC │  │ SCHEDULING │  │  TASK SYNC   │
     │               │  │   ENGINE   │  │              │
     │ Google OAuth  │  │            │  │ OmniFocus    │
     │ Outlook Graph │  │ SlotScorer │  │ Google Tasks │
     │ CalDAV/tsdav  │  │ TimeSlotMgr│  │ Outlook Tasks│
     └───────┬───────┘  │ Scheduler  │  └──────┬───────┘
             │          │ GCalPush   │          │
             │          └─────┬──────┘          │
             │                │                 │
             ▼                ▼                 ▼
     ┌─────────────────────────────────────────────────┐
     │              PRISMA ORM + POSTGRESQL             │
     │                                                 │
     │  CalendarEvent │ Task │ Schedule │ DayBlock      │
     │  CalendarFeed  │ Project │ TaskChange │ User     │
     └─────────────────────────────────────────────────┘
```

## Scheduling Pipeline (Detail)

```
triggerScheduleAllTasks() [task store]
    │
    ▼
POST /api/tasks/schedule-all
    │
    ▼
TaskSchedulingService.scheduleAllTasksForUser(userId)
    │
    ├─ Load all Schedules (named + system 24/7)
    ├─ ScheduleResolver: resolve task→project→area→system schedule
    ├─ Group tasks by resolved schedule (named first, system last)
    │
    ▼ For each schedule group:
SchedulingService.scheduleMultipleTasks()
    │
    ├─ Sort tasks: priority (urgent→none), then dueDate
    │
    ▼ For each task:
TimeSlotManager.findAvailableSlots()
    │
    ├─ 1. generatePotentialSlots()    [30-min intervals within time blocks]
    ├─ 2. filterByDayBlocks()         [full-day + rest-of-day blocks]
    ├─ 3. filterByWorkHours()         [schedule time blocks]
    ├─ 4. removeConflicts()           [calendar events + scheduled tasks]
    ├─ 5. applyBufferTimes()          [mark buffer availability]
    ├─ 6. scoreSlots()                [7-factor weighted scoring]
    └─ 7. sortByScore()               [best slot first]
    │
    ▼
Select best slot → Update task.scheduledStart/End
    │
    ├─ Register in shared conflict map (prevents double-booking)
    └─ Add to cross-schedule shared conflicts
    │
    ▼
GCalPushService.syncScheduledTasksToGCal() [async, fire-and-forget]
    │
    ├─ Partition: toCreate / toUpdate / toDelete
    └─ Throttled batch (5 ops, 1.1s delay) → Google Calendar API
```

## Key Architecture Components

### 1. Scheduling Engine
**Location**: `src/services/scheduling/`
**Detailed docs**: [scheduling-engine.md](./scheduling-engine.md)

| File | Purpose |
|------|---------|
| `TaskSchedulingService.ts` | Entry point. Loads schedules, groups tasks, coordinates cross-schedule conflicts |
| `SchedulingService.ts` | Per-group orchestrator. Priority sorting, window fallback (14d then 90d) |
| `TimeSlotManager.ts` | Core pipeline: generate slots, filter, score, sort |
| `SlotScorer.ts` | 7-factor weighted scoring algorithm |
| `CalendarServiceImpl.ts` | Conflict detection with 30-min event cache |
| `ScheduleResolver.ts` | Schedule hierarchy: task > project > area > system |
| `GCalPushService.ts` | Async push of scheduled tasks to Google Calendar |

### 2. Calendar Integrations
**Location**: `src/app/api/calendar/`, `src/lib/`
**Detailed docs**: [calendar-integrations.md](./calendar-integrations.md)

| Provider | Auth | Sync Method | All-Day Detection |
|----------|------|-------------|-------------------|
| Google | OAuth 2.0 | Full fetch (year range) | `!event.start.dateTime` |
| Outlook | Azure AD | Delta sync (incremental) | `event.isAllDay` |
| CalDAV | Basic Auth | Full fetch + RRule expand | `DTSTART;VALUE=DATE` |

**GCal Push** (tasks → calendar): Scheduled tasks are mirrored to a designated Google Calendar feed. Batch-throttled (5 ops/1.1s) to avoid rate limits.

**No webhooks/polling implemented** - syncs are user-triggered or on task changes.

### 3. Task Sync (OmniFocus + Others)
**Location**: `src/lib/task-sync/`, `src/app/api/sync/omnifocus/`
**Detailed docs**: [task-sync-engine.md](./task-sync-engine.md)

**OmniFocus Flow**:
- External script polls `GET /api/sync/omnifocus/changes` for unsynced changes
- Script pushes updates back via task API with `X-Sync-Source: omnifocus` header
- Echo prevention: changes with `changeSource: "omnifocus"` are excluded from the changes endpoint
- Script acknowledges via `POST /api/sync/omnifocus/ack`

**Change Tracking**: All task mutations create `TaskChange` records (CREATE/UPDATE/DELETE) which drive bidirectional sync.

### 4. Database (Prisma + PostgreSQL)
**Location**: `prisma/schema.prisma`
**Detailed docs**: [database-schema.md](./database-schema.md)

**Key models**: User, Task, Project, Schedule, ScheduleTimeBlock, DayBlock, CalendarFeed, CalendarEvent, TaskProvider, TaskListMapping, TaskChange, ConnectedAccount

### 5. Day Blocks (Done for Day / Block Day)
**Location**: `src/app/api/day-blocks/route.ts`, `TimeSlotManager.ts:filterByDayBlocks()`

- **Full day block**: `blockFrom = null` - blocks entire day
- **Rest of day**: `blockFrom = currentTime` - blocks from that moment forward
- UI: "Done" button on today's date header in WeekView
- Stored in `DayBlock` table with unique constraint on `(userId, date)`
- Scheduler loads blocks via `prisma.dayBlock.findMany()` and filters slots in step 2 of pipeline

### 6. Frontend State (Zustand)
**Location**: `src/store/`

| Store | Key State | Persistence |
|-------|-----------|-------------|
| `task.ts` | tasks[], tags[], filters, loading | localStorage |
| `calendar.ts` | feeds, events, syncFeed(), loadFromDatabase() | - |
| `settings.ts` | user/calendar/notification/integration/autoSchedule settings | localStorage |

### 7. Authentication
**Location**: `src/lib/auth/`

- NextAuth v4 with JWT strategy (1-year token lifetime)
- Providers: Google OAuth, Azure AD, Credentials (email/password with bcrypt)
- API auth: Session-based OR API key (Bearer token, SHA256 hashed in DB)
- Adapter: Prisma

## Key File Quick Reference

| Need to... | Look at |
|------------|---------|
| Fix scheduling bug | `src/services/scheduling/TimeSlotManager.ts` |
| Change scoring weights | `src/services/scheduling/SlotScorer.ts` |
| Fix GCal push issues | `src/services/scheduling/GCalPushService.ts` |
| Debug calendar sync | `src/app/api/calendar/{provider}/route.ts` |
| Fix OmniFocus sync | `src/app/api/sync/omnifocus/changes/route.ts` |
| Change task API behavior | `src/app/api/tasks/[id]/route.ts` |
| Modify day blocks | `src/app/api/day-blocks/route.ts` |
| Update scheduling trigger | `src/store/task.ts:triggerScheduleAllTasks()` |
| Fix conflict detection | `src/services/scheduling/CalendarServiceImpl.ts` |
| Change slot generation | `src/services/scheduling/TimeSlotManager.ts:generatePotentialSlots()` |
| Modify schedule resolution | `src/services/scheduling/ScheduleResolver.ts` |
| Fix all-day event handling | `src/app/api/calendar/google/route.ts` (line ~291) |
| Change UI week view | `src/components/calendar/WeekView.tsx` |
| Modify task store | `src/store/task.ts` |

## Configuration

| Setting | Location | Notes |
|---------|----------|-------|
| Database | `DATABASE_URL` in `.env` | PostgreSQL |
| Auth | `NEXTAUTH_SECRET`, provider client IDs | `.env` |
| SaaS toggle | `NEXT_PUBLIC_ENABLE_SAAS_FEATURES` | `false` for local/OS build |
| Build | `npm run build:os` | Open-source build (no SaaS) |
| Dev server | `npm run dev` | Turbopack enabled |
| Type check | `npm run type-check` | `tsc --noEmit` |
| DB migrations | `npx prisma migrate deploy` | Auto-runs in Docker entrypoint |

## Deployment (Local Mac Studio)

- Runs via **LaunchAgent**: `com.valhalla-farms.fluid-calendar`
- Located at: `~/Library/LaunchAgents/com.valhalla-farms.fluid-calendar.plist`
- Restart: `launchctl kickstart -k gui/$(id -u)/com.valhalla-farms.fluid-calendar`
- Database: Local PostgreSQL
- No Redis needed (BullMQ only for SaaS mode)

## Known Quirks / Gotchas

1. **DayBlock date stored as midnight UTC** - queries must normalize to start-of-day (fixed 2026-04-20)
2. **Event cache TTL is 30 min** - no invalidation on event changes; stale reads possible
3. **Buffer time scoring is advisory** - slots within buffers can still be scheduled (TODO in code)
4. **No background sync** - all calendar/task syncs are user-triggered or on-change
5. **GCal push is fire-and-forget** - failures logged but don't block scheduling
6. **Task Calendar is write-only** - `autoSync: false` prevents pulling back pushed events
7. **Slot resolution is fixed 30-min** - not configurable, affects minimum task duration granularity
8. **Energy levels require Schedule config** - won't score if `highEnergyStart/End` etc. are null
