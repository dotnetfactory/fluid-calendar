# Scheduling Engine

Deep technical reference for the auto-scheduling subsystem.

## File Map

```
src/services/scheduling/
├── TaskSchedulingService.ts   (270 lines) — Top-level entry point
├── SchedulingService.ts       (274 lines) — Per-group orchestrator
├── TimeSlotManager.ts         (509 lines) — Slot pipeline
├── SlotScorer.ts              (240 lines) — 7-factor scoring
├── CalendarServiceImpl.ts     (303 lines) — Conflict detection + cache
├── CalendarService.ts         (31 lines)  — Interface
├── ScheduleResolver.ts        (107 lines) — Schedule hierarchy
└── GCalPushService.ts         (399 lines) — Push to Google Calendar
```

## Entry Point: TaskSchedulingService

**Function**: `scheduleAllTasksForUser(userId, fullRebalance=false)`
**File**: `TaskSchedulingService.ts:94-270`

### Load Phase (lines 101-148)
1. Load all schedules (with time blocks) for user
2. Load auto-schedule settings (check `groupByProject` flag)
3. Query eligible tasks:
   - `isAutoScheduled = true`
   - `scheduleLocked = false`
   - `isBlocked = false`
   - `duration > 0`
   - Status not COMPLETED or IN_PROGRESS
4. Query locked tasks (they block time globally)

### Group Phase (lines 165-225)
1. `ScheduleResolver.groupTasksBySchedule()` - named schedules first, system (24/7) last
2. Shared calendar service instance (event cache reused across groups)
3. Shared conflicts map seeded with locked tasks
4. For each group: create `SchedulingService`, call `scheduleMultipleTasks()`
5. Results from each group feed into shared conflicts for next group

### Finalization (lines 227-246)
- Update `lastScheduled` timestamp
- Return all scheduled tasks with relations

## Schedule Resolution

**File**: `ScheduleResolver.ts`

**Hierarchy** (task > project > area > system):
```
resolveScheduleId(task):
  if task.scheduleId → use it
  if task.project.scheduleId → use it
  if task.project.area.scheduleId → use it
  else → use system schedule (24/7)
```

**Grouping**: `groupTasksBySchedule()` (lines 78-106)
- Named schedules processed first (have specific time blocks)
- System schedule processed last (can use remaining 24/7 time)
- This ordering prevents named-schedule tasks from losing their preferred times

## Slot Generation: TimeSlotManager

**Function**: `findAvailableSlots(task, startDate, endDate, userId)`
**File**: `TimeSlotManager.ts:83-150`

### Pipeline Steps

#### 1. generatePotentialSlots (lines 250-312)
- Iterates day-by-day from effectiveStartDate to endDate
- For each day, iterates through schedule's ScheduleTimeBlocks for that day-of-week
- Generates slots at **30-minute intervals** within each time block
- First day: starts at `max(now + 15min, block.startHour)`, rounded up to next 30-min
- Slot duration = `task.duration` (or 30-min default)
- Slots don't overflow time block boundaries

#### 2. filterByDayBlocks (lines 312-334)
- Loads DayBlock records for the date range (cached after first load)
- Full day block (`blockFrom = null`): rejects all slots on that date
- Rest-of-day block: rejects slots where `slot.start >= blockFrom`
- Date comparison uses timezone-aware conversion (`toZonedTime`)

#### 3. filterByWorkHours (lines 336-344)
- Safety filter (slots are already generated within time blocks)
- Validates start/end hours against schedule's time block definitions

#### 4. removeConflicts (lines 400-452)
- Uses `CalendarService.findBatchConflicts()` for efficiency
- Expands check window by `bufferMinutes` on both sides
- Checks against:
  - Calendar events (skip `free`/`transparent` status)
  - Already-scheduled tasks (in-memory + DB)
- Returns immediately on first calendar conflict per slot

#### 5. applyBufferTimes (lines 459-467)
- Checks if before-buffer and after-buffer periods are within work hours
- Marks `slot.hasBufferTime = true` if both available
- NOTE: Does NOT prevent scheduling in buffer zones (advisory only)

#### 6. scoreSlots
- Delegates to `SlotScorer.scoreSlot()` for each slot

#### 7. sortByScore
- Descending order (highest score = best fit)

## Scoring Algorithm: SlotScorer

**Function**: `scoreSlot(slot, task)`
**File**: `SlotScorer.ts:66-101`

### Factors and Weights

| # | Factor | Weight | Range | Logic |
|---|--------|--------|-------|-------|
| 1 | workHourAlignment | 1.0 | 0-1 | Binary: 1 if within work hours |
| 2 | energyLevelMatch | 1.5 | 0-1 | Exact match=1.0, adjacent=0.5, opposite=0 |
| 3 | projectProximity | 0.5 | 0-1 | `exp(-hourDist/4)` decay from same-project tasks |
| 4 | bufferAdequacy | 0.8 | 0-1 | Binary: 1 if both buffers fit in work hours |
| 5 | timePreference | 1.2 | 0-1 | Match to morning/afternoon/evening preference |
| 6 | deadlineProximity | 3.0 | 0-2 | Overdue boost + future decay (see below) |
| 7 | priorityScore | 1.8 | 0.25-1.0 | URGENT=1.0, HIGH=0.9, MED=0.7, LOW=0.5, NONE=0.25 |

**Total weight**: 10.6
**Formula**: `score = sum(factor * weight) / totalWeight`

### Deadline Proximity (most influential, weight 3.0)

**Overdue tasks** (lines 153-175):
```
daysOverdue = minutesOverdue / 1440
baseScore = min(2.0, 1.0 + daysOverdue/14)  // caps at 2.0 after 14 days
timePenalty = min(0.5, daysToSlot/14)        // later slots penalized
score = baseScore * (1 - timePenalty)
```
Effect: overdue tasks get high scores, with earlier slots scoring higher.

**Future tasks** (lines 177-189):
```
daysToDeadline = minutesToDeadline / 1440
score = min(0.99, exp(-daysToDeadline/3))    // 3-day half-life
```
Effect: tasks due soon get exponentially higher scores.

### Energy Level Matching (lines 107-125)

Energy windows defined per Schedule:
- `highEnergyStart/End` (e.g., 8-11 AM)
- `mediumEnergyStart/End` (e.g., 11 AM - 3 PM)
- `lowEnergyStart/End` (e.g., 3-6 PM)

Scoring:
- Exact match (high task in high window): 1.0
- Adjacent (high task in medium window): 0.5
- Opposite (high task in low window): 0.0
- No energy level set: 0.5 (neutral)

### Project Proximity (lines 127-151)

Only active when `groupByProject = true` in auto-schedule settings.
- Finds closest same-project scheduled task (in-memory)
- Score: `exp(-hourDistance/4)` (exponential decay, 4-hour half-life)
- Effect: clusters same-project tasks temporally

## Conflict Detection: CalendarServiceImpl

**File**: `CalendarServiceImpl.ts`

### Event Cache (lines 18-65)
- Caches calendar events for the requested week range
- **TTL**: 30 minutes
- **Scope**: Expands to full weeks for cache efficiency
- **Invalidation**: Time-based only (no event-change detection)

### findConflicts (lines 67-143)
Single-slot check:
1. Fetch events for slot's time range (from cache)
2. Skip events with `status = "free"` or `"transparent"`
3. Check overlap with `areIntervalsOverlapping()`
4. Return immediately on first calendar conflict
5. Only then check scheduled task conflicts (DB query)

### findBatchConflicts (lines 206-302)
Multi-slot optimization:
- Single DB fetch for all scheduled tasks
- Single event fetch covering entire slot range
- Per-slot checking against pre-loaded data
- Much faster than N individual queries

## GCal Push Service

**File**: `GCalPushService.ts`

### syncScheduledTasksToGCal (lines 281-399)

**Trigger**: Called async after `scheduleAllTasksForUser()` completes.

**Flow**:
1. Resolve task calendar feed (must be type GOOGLE)
2. Fetch tasks by ID with scheduling fields
3. Partition into three operations:
   - `toCreate`: has scheduledStart/End, no gcalEventId
   - `toUpdate`: has scheduledStart/End AND gcalEventId
   - `toDelete`: no scheduledStart/End but has gcalEventId
4. Execute in order: Delete > Update > Create
5. Throttle: 5 operations per batch, 1.1s between batches
6. Stop on 429 rate limit (remaining items sync next run)

**Event format**: Task title, description + "[Managed by FluidCalendar]", non-allDay, start/end from scheduler.

**Error handling**:
- 404 (event deleted externally): Clear gcalEventId, allow re-push
- 429 (rate limit): Stop batch, log remaining count
- Other: Mark `gcalSyncStatus: "error"`

## Window Strategy

**File**: `SchedulingService.ts:210-212`

```typescript
const windows = fullRebalance
  ? [{ days: 14 }, { days: 90 }]    // Try 2 weeks, then 3 months
  : [{ days: 14 }];                 // Normal: 2 weeks only
```

- Standard scheduling: 14-day lookahead
- Full rebalance: tries 14 days first, falls back to 90 days if no slots found
- Tasks that can't be placed remain unscheduled

## Task Eligibility Criteria

A task is scheduled if ALL of:
- `isAutoScheduled = true`
- `scheduleLocked = false` (locked tasks are immovable)
- `isBlocked = false`
- `duration > 0`
- `status` not in `['completed', 'in_progress']`
- `postponedUntil` is null or in the past
- `startDate` is null or within the scheduling window
