# Task Sync Engine

Technical reference for bidirectional task synchronization (OmniFocus, Google Tasks, Outlook Tasks).

## Architecture

```
External System (OmniFocus / Google / Outlook)
        │                    ▲
        │ pull changes       │ push changes
        ▼                    │
┌─────────────────────────────────────┐
│         SYNC API ROUTES             │
│  /api/sync/omnifocus/changes  (GET) │
│  /api/sync/omnifocus/ack     (POST) │
│  /api/task-sync/sync         (POST) │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      TaskSyncManager (952 lines)    │
│  src/lib/task-sync/task-sync-       │
│  manager.ts                         │
│                                     │
│  - syncBidirectional()              │
│  - resolveTaskConflict()            │
│  - processCreateChange()            │
│  - processUpdateChange()            │
│  - processDeleteChange()            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│     TaskChangeTracker (334 lines)   │
│  src/lib/task-sync/task-change-     │
│  tracker.ts                         │
│                                     │
│  - trackChange()                    │
│  - getUnsyncedChanges()             │
│  - markAsSynced()                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│         DATABASE (Prisma)           │
│  Task, TaskChange, TaskProvider,    │
│  TaskListMapping                    │
└─────────────────────────────────────┘
```

## OmniFocus Sync (Primary Integration)

### How It Works

OmniFocus sync is **API-driven from an external script** (the OF-to-Motion sync script repurposed for FluidCalendar). The script runs via LaunchAgent on the Mac Studio.

### Inbound (OF to FluidCalendar)

The external script:
1. Reads tasks from OmniFocus (via JXA/OmniJS)
2. Pushes to FluidCalendar via `POST /api/tasks` or `PUT /api/tasks/{id}`
3. Includes header: `X-Sync-Source: omnifocus`
4. This header prevents the change from being echoed back

### Outbound (FluidCalendar to OF)

The external script:
1. Polls `GET /api/sync/omnifocus/changes` for unsynced changes
2. Filters: excludes changes where `changeSource = "omnifocus"` (echo prevention)
3. Returns: task changes with full task data, timestamps
4. Script applies changes to OmniFocus
5. Acknowledges via `POST /api/sync/omnifocus/ack` with change IDs
6. Acknowledged changes marked `synced: true`

### API Routes

**GET /api/sync/omnifocus/changes** (`src/app/api/sync/omnifocus/changes/route.ts:16-92`)
```
Response: {
  changes: [{
    id, taskId, changeType, changeData, timestamp,
    task: { title, status, dueDate, ... }
  }]
}
```

**POST /api/sync/omnifocus/ack** (`src/app/api/sync/omnifocus/ack/route.ts:15-59`)
```
Body: { changeIds: string[] }
Effect: marks TaskChange.synced = true
```

## Change Tracking System

### TaskChange Model
```prisma
model TaskChange {
  id           String    // cuid
  taskId       String?   // null if task deleted
  changeType   String    // "CREATE" | "UPDATE" | "DELETE"
  changeData   Json?     // field deltas (what changed)
  changeSource String?   // "user" | "omnifocus" | null
  synced       Boolean   // false until acknowledged
  timestamp    DateTime  // when change occurred
  mappingId    String?   // which TaskListMapping
  providerId   String?   // which TaskProvider
  userId       String
}
```

### When Changes Are Tracked

**Task Creation** (`POST /api/tasks`, lines 106-204):
- If task has `projectId` with a TaskListMapping, tracks CREATE change
- `changeData` includes all initial field values

**Task Update** (`PUT /api/tasks/[id]`, lines 62-342):
- Reads `X-Sync-Source` header (default: "user")
- Tracks UPDATE change with field deltas
- Only if: task has mapping OR source is "omnifocus" with externalTaskId

**Task Deletion**:
- Tracks DELETE change with `externalTaskId` and `source` in changeData
- Enables external script to delete the corresponding external task

### Echo Prevention

Critical design: changes from the sync script must not echo back.

1. Script sends `X-Sync-Source: omnifocus` header on writes
2. TaskChange created with `changeSource: "omnifocus"`
3. `/api/sync/omnifocus/changes` excludes `changeSource: "omnifocus"`
4. Result: script never sees its own changes

## TaskSyncManager (Core Logic)

**File**: `src/lib/task-sync/task-sync-manager.ts` (952 lines)

### syncBidirectional() (lines 305-630)

Five-step process:

**Step 1** (lines 313-331): Fetch local tasks
- Query DB for tasks in this mapping's project
- Include all relations (tags, dependencies)

**Step 2** (lines 346-430): Push local changes outward
- Get unsynced changes from TaskChangeTracker
- For each change: execute against external system
- CREATE: create task externally, link with externalTaskId
- UPDATE: update external task fields
- DELETE: delete external task

**Step 3** (lines 432-525): Process external tasks inward
- Fetch all tasks from external system
- For each: check if local task exists (by externalTaskId)
- If exists: `resolveTaskConflict()` (timestamp comparison)
- If not: attempt title+dueDate match with unlinked locals
- If still not: create new local task

**Step 4** (lines 527-568): Link unlinked local tasks
- Local tasks without externalTaskId
- Create in external system
- Link with returned externalTaskId

**Step 5** (lines 570-617): Clean up deleted externals
- Local tasks with externalTaskId but no remote counterpart
- Only delete if no local changes in last **24 hours** (safety)

### Conflict Resolution (lines 864-950)

```
resolveTaskConflict(localTask, externalTask):
  if external.updatedAt > local.updatedAt:
    → merge external data into local (preserve FC-specific fields)
  if local.updatedAt > external.updatedAt:
    → update external with local data
  if equal:
    → no update
```

"FC-specific fields" preserved on external-wins: `isAutoScheduled`, `scheduledStart/End`, `scheduleScore`, `scheduleId`, `isBlocked`

## Task Providers

### Provider Interface
```typescript
interface TaskSyncProvider {
  getTasks(listId: string): Promise<ExternalTask[]>
  createTask(listId: string, task: TaskData): Promise<ExternalTask>
  updateTask(listId: string, taskId: string, updates: Partial<TaskData>): Promise<ExternalTask>
  deleteTask(listId: string, taskId: string): Promise<void>
}
```

### Field Mapping

**Google Tasks** (`src/lib/task-sync/providers/google-field-mapper.ts`):
| FC Field | Google Field | Notes |
|----------|-------------|-------|
| title | title | Direct map |
| status | status | todo → "needsAction", completed → "completed" |
| description | notes | Direct map |
| dueDate | due | UTC format |
| completedAt | completed | UTC format |
| priority | (not synced) | Preserved locally only |

**Outlook Tasks** (`src/lib/task-sync/providers/outlook-field-mapper.ts`):
| FC Field | Outlook Field | Notes |
|----------|--------------|-------|
| title | title | Direct map |
| status | status | todo→"notStarted", in_progress→"inProgress", completed→"completed" |
| priority | importance | high/normal/low bidirectional |
| dueDate | dueDate | UTC |
| completedAt | completedDate | UTC |

## Task List Mapping

```prisma
model TaskListMapping {
  providerId       String       // Which TaskProvider
  projectId        String       // FC Project
  externalListId   String       // External list/folder ID
  externalListName String
  direction        String       // "incoming" | "outgoing" | "bidirectional"
  isAutoScheduled  Boolean      // Auto-schedule imported tasks?
  syncEnabled      Boolean
  syncStatus       String?
  lastError        String?
}
```

**Direction controls**:
- `incoming`: External changes reflected locally, local changes NOT pushed
- `outgoing`: Local changes pushed externally, external changes NOT pulled
- `bidirectional`: Full two-way sync

## Task Fields Relevant to Sync

```prisma
model Task {
  // Sync identification
  externalTaskId     String?   // ID in external system
  externalListId     String?   // Which external list
  source             String?   // "omnifocus" | "google" | "outlook"
  
  // Sync state
  lastSyncedAt       DateTime?
  externalCreatedAt  DateTime?
  externalUpdatedAt  DateTime? // For conflict resolution
  syncStatus         String?   // "synced" | "pending" | "error"
  syncHash           String?   // Change detection hash
  syncError          String?
  skipSync           Boolean   // Opt-out of sync for this task
}
```

## Manual Sync Trigger

**Route**: `POST /api/task-sync/sync` (`src/app/api/task-sync/sync/route.open.ts:36-258`)

```
Body: { providerId OR mappingId, direction }
Response: { imported, updated, deleted, skipped, errors }
```

- Synchronous (blocks until complete)
- Called from TaskSyncSettings UI "Sync Now" button
- No background/queue processing in open-source mode

## Key Design Decisions

1. **Change tracking over full sync**: Only deltas are synced, more efficient
2. **Echo prevention via changeSource**: Prevents infinite loops
3. **24-hour delete grace period**: Won't delete local tasks with recent edits
4. **Timestamp conflict resolution**: Simple, deterministic (latest wins)
5. **Task Calendar write-only**: Prevents pulling back GCal-pushed events
6. **FC fields preserved on conflict**: Scheduling data never overwritten by external
7. **No background sync**: All syncs are explicit (manual or script-triggered)
