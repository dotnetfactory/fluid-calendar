# Task Synchronization Implementation Plan

This document outlines the implementation plan for enhancing task synchronization in FluidCalendar. The goal is to transform our current one-way Outlook Tasks import system into a comprehensive two-way sync infrastructure that can support multiple task services (Outlook, Asana, CalDAV, etc.) while maintaining a consistent user experience.

## Table of Contents

1. [Current Implementation Analysis](#current-implementation-analysis)
2. [Architecture Overview](#architecture-overview)
3. [Schema Changes](#schema-changes)
4. [Core Components](#core-components)
5. [Project Integration](#project-integration)
6. [Integration-Specific Implementations](#integration-specific-implementations)
7. [API Endpoints](#api-endpoints)
8. [Background Jobs](#background-jobs)
9. [UI Components](#ui-components)
10. [Testing Plan](#testing-plan)
11. [Phased Implementation Plan](#phased-implementation-plan)

## Current Implementation Analysis

The current system implements a one-way import of Outlook Tasks with these key components:

- `OutlookTasksService` class that handles API calls to Microsoft Graph API
- `OutlookTaskListMapping` model to track mappings between Outlook task lists and local projects
- Basic import functionality that creates local copies of remote tasks
- UI components for initiating imports and mapping task lists to projects

Limitations:

- One-way sync only (changes in FluidCalendar aren't synced back to Outlook)
- No change tracking or conflict resolution
- No support for periodic syncing
- No support for other task sources
- Limited to a one-time import model

## Architecture Overview

The enhanced architecture will consist of:

1. **Abstract Task Provider Interface**: A common interface for all task providers
2. **Provider-Specific Implementations**: Concrete implementations for each supported service
3. **TaskSyncManager**: Central service to coordinate sync operations across providers
4. **TaskChangeTracker**: Track changes to tasks for efficient syncing
5. **SyncQueue System**: Background job infrastructure for periodic sync operations
6. **Conflict Resolution System**: Strategies for resolving sync conflicts

## Schema Changes

### Create `TaskProvider` Model

```prisma
model TaskProvider {
  id            String          @id @default(cuid())
  type          String          // "OUTLOOK", "ASANA", "CALDAV", etc.
  name          String
  enabled       Boolean         @default(true)
  userId        String
  user          User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  accountId     String?
  account       ConnectedAccount? @relation(fields: [accountId], references: [id])
  mappings      TaskListMapping[]
  lastSyncedAt  DateTime?
  syncEnabled   Boolean         @default(true)
  syncInterval  Int             @default(15) // minutes
  syncStatus    String?         // "SYNCING", "ERROR", "OK"
  errorMessage  String?
  settings      Json?           // Provider-specific settings
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@unique([userId, type, accountId])
  @@index([userId])
  @@index([type])
}
```

### Create `TaskListMapping` Model (replaces `OutlookTaskListMapping`)

```prisma
model TaskListMapping {
  id               String        @id @default(cuid())
  externalListId   String
  projectId        String
  project          Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  providerId       String
  provider         TaskProvider  @relation(fields: [providerId], references: [id], onDelete: Cascade)
  name             String
  lastSyncedAt     DateTime?
  isAutoScheduled  Boolean       @default(true)
  syncStatus       String?       // "SYNCING", "ERROR", "OK"
  errorMessage     String?
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  @@unique([externalListId, projectId, providerId])
  @@index([externalListId])
  @@index([projectId])
  @@index([providerId])
}
```

### Update `Task` Model

```prisma
model Task {
  // Existing fields...

  // Modified sync fields
  externalTaskId   String?
  externalUrl      String?      // URL to the task in the external system
  source           String?      // "OUTLOOK", "ASANA", "CALDAV", "LOCAL", etc.
  lastSyncedAt     DateTime?
  externalUpdatedAt DateTime?   // Last modified time in the external system
  syncStatus       String?      // "SYNCING", "SYNCED", "ERROR", "CONFLICT"
  providerId       String?
  provider         TaskProvider? @relation(fields: [providerId], references: [id])

  // @@index for the new fields
  @@index([providerId])
  @@index([syncStatus])
}
```

### Job Record Schema (for sync jobs)

```prisma
// Existing JobRecord model should be sufficient
// It already has fields for tracking jobs, data, status, etc.
```

## Core Components

### 1. Task Provider Interface

Create an abstract interface that all provider implementations must follow:

```typescript
// src/lib/task-sync/providers/task-provider.interface.ts
export interface TaskProviderInterface {
  // Provider information
  getType(): string; // Returns provider type identifier
  getName(): string; // Returns human-readable provider name

  // Task list operations
  getTaskLists(): Promise<TaskList[]>;

  // Task operations
  getTasks(listId: string, options?: SyncOptions): Promise<ExternalTask[]>;
  createTask(listId: string, task: TaskToCreate): Promise<ExternalTask>;
  updateTask(
    listId: string,
    taskId: string,
    updates: TaskUpdates
  ): Promise<ExternalTask>;
  deleteTask(listId: string, taskId: string): Promise<void>;

  // Sync operations
  getChanges(listId: string, since?: Date): Promise<TaskChange[]>;

  // Authentication/connection
  validateConnection(): Promise<boolean>;
}
```

### 2. Task Sync Manager

Central service to manage synchronization across providers:

```typescript
// src/lib/task-sync/task-sync-manager.ts
export class TaskSyncManager {
  // Initialize provider based on type
  getProvider(providerId: string): Promise<TaskProviderInterface>;

  // Sync operations
  syncTaskList(mappingId: string): Promise<SyncResult>;
  syncAllForUser(userId: string): Promise<SyncResult[]>;

  // Task operations that trigger syncs
  createTask(task: NewTask): Promise<Task>;
  updateTask(taskId: string, updates: UpdateTask): Promise<Task>;
  deleteTask(taskId: string): Promise<void>;

  // Conflict resolution
  resolveConflict(
    taskId: string,
    resolution: ConflictResolution
  ): Promise<Task>;
}
```

### 3. Task Change Tracker

Service to track changes to tasks for efficient syncing:

```typescript
// src/lib/task-sync/task-change-tracker.ts
export class TaskChangeTracker {
  // Track changes to local tasks
  trackChange(
    taskId: string,
    changeType: "CREATE" | "UPDATE" | "DELETE",
    data?: any
  ): Promise<void>;

  // Get changes since last sync
  getChangesSince(mappingId: string, since: Date): Promise<TaskChange[]>;

  // Mark changes as synced
  markAsSynced(changeIds: string[]): Promise<void>;
}
```

## Project Integration

Different task providers have their own concept of organizing tasks, which we need to map to our project structure:

### Project Mapping Concepts

| Provider | Their Concept    | Our Mapping |
| -------- | ---------------- | ----------- |
| Outlook  | Task Lists       | Projects    |
| Asana    | Projects/Boards  | Projects    |
| CalDAV   | Task Collections | Projects    |
| Todoist  | Projects         | Projects    |
| Jira     | Boards/Projects  | Projects    |

### Project Mapping Strategy: 1-to-1 vs 1-to-Many

We have two potential approaches for mapping external task lists to FluidCalendar projects:

#### Option 1: One-to-One Mapping (Recommended)

Each external task list/project maps to exactly one FluidCalendar project.

**Advantages:**

- Simpler conceptual model for users to understand
- Clearer sync behavior (changes to a project affect one external list)
- More straightforward conflict resolution
- Easier to visualize in the UI

**Disadvantages:**

- Less flexibility for users who want to combine tasks from multiple external lists
- Could lead to project proliferation if users have many external lists

#### Option 2: Many-to-One Mapping

Multiple external task lists could map to a single FluidCalendar project.

**Advantages:**

- More flexible organization options for users
- Reduces project proliferation
- Could allow aggregating related tasks from different providers

**Disadvantages:**

- Complex sync logic (which external list should a new task go to?)
- Ambiguous conflict resolution
- Difficult to represent in UI without confusion
- Risk of data inconsistency

**Recommendation:** Start with a 1-to-1 mapping model for simplicity and reliability. If user feedback strongly indicates a need for many-to-one mapping, we can consider adding this as an advanced feature in a future phase.

### Project Synchronization Strategy

1. **One-to-One Mapping**:

   - Each external task list/project maps to exactly one FluidCalendar project
   - The `TaskListMapping` table maintains this relationship
   - Projects can have tasks from multiple providers through separate 1:1 mappings
   - Example: A project "Work" could be mapped to an Outlook task list AND a separate Asana project, but not multiple Outlook lists

2. **Metadata Synchronization**:

   - Project name can be synced bidirectionally when supported by the provider
   - Project color can be synced when available in the external provider
   - Project description can be synced when available

3. **Project Creation Flows**:

   - When mapping a new external task list, users can:
     - Map to an existing FluidCalendar project (as long as it doesn't already have a mapping to the same provider)
     - Create a new project with the same name as the external list
     - Optionally sync project metadata

4. **Project Deletion Handling**:
   - If a project is deleted in FluidCalendar:
     - Option 1: Delete the mapping but preserve the external task list
     - Option 2: Delete both the mapping and the external task list (if supported)
   - If an external task list is deleted:
     - Option 1: Preserve the FluidCalendar project but mark tasks as disconnected
     - Option 2: Delete the FluidCalendar project (user configurable)

### Project-aware Task Operations

1. **Task Creation**:

   - When a task is created in a synced project, it gets created in the corresponding external list
   - Project field is mandatory for synced tasks

2. **Task Moving**:

   - When a task is moved to a different project in FluidCalendar:
     - If target project is mapped to the same provider: move task in external system
     - If target project is mapped to a different provider: remove from original external list, create in new provider if that project is mapped
     - If target project is not mapped: disconnect task from external system

3. **Advanced Project Features Handling**:

   Some task providers offer advanced project features that don't map directly to our project model:

   - **Project Hierarchies**: For providers with nested projects (Asana, Todoist), we'll store the project hierarchy path in the `settings` JSON field of `TaskProvider`
   - **Project Sections/Columns**: For providers with Kanban-style columns (Asana, Jira), we'll map their columns to our task statuses
   - **Project Custom Fields**: Store provider-specific project metadata in the `settings` JSON field

### Required Schema Updates

Add to the `Project` model:

```prisma
model Project {
  // Existing fields...

  // Fields for external sync
  externalProjectIds Json?       // Store multiple external IDs for different providers
  lastSyncedAt       DateTime?
  syncStatus         String?     // "SYNCING", "SYNCED", "ERROR"
  mappings           TaskListMapping[]
}
```

### TaskListMapping Enhanced Fields

```prisma
model TaskListMapping {
  // Existing fields...

  // Enhanced mapping fields
  externalListColor  String?
  externalListPath   String?    // For hierarchical providers, the path to this list
  syncProjectName    Boolean    @default(true)  // Whether to sync project name changes
  syncDirection      String     @default("BIDIRECTIONAL") // "TO_PROVIDER", "FROM_PROVIDER", "BIDIRECTIONAL"
  // We'll enforce 1-to-1 mapping at the application level rather than adding a mapping type field

  // ... other existing fields
}
```

### Enforcing Mapping Constraints

To enforce our 1-to-1 mapping strategy:

1. **Database constraint**: The unique index on `[externalListId, projectId, providerId]` in the `TaskListMapping` model prevents multiple mappings of the same external list.

2. **Application-level constraint**: When creating a new mapping, we'll check:

   - That the project doesn't already have a mapping for the same provider
   - That the external list isn't already mapped to another project

3. **UI constraints**: The mapping UI will visually indicate existing mappings and prevent creating invalid ones.

4. **Future expansion**: If we later decide to support many-to-one mappings, we can modify these constraints without schema changes.

## Integration-Specific Implementations

### 1. Outlook Tasks Provider

```typescript
// src/lib/task-sync/providers/outlook-provider.ts
export class OutlookTaskProvider implements TaskProviderInterface {
  // Implement all required methods using Microsoft Graph API
  // Reuse code from existing OutlookTasksService
}
```

### 2. CalDAV Tasks Provider

```typescript
// src/lib/task-sync/providers/caldav-provider.ts
export class CalDAVTaskProvider implements TaskProviderInterface {
  // Implement all required methods using CalDAV API
}
```

### 3. Asana Provider (Future)

```typescript
// src/lib/task-sync/providers/asana-provider.ts
export class AsanaTaskProvider implements TaskProviderInterface {
  // Implement all required methods using Asana API
}
```

## API Endpoints

### Provider Management

```
GET /api/tasks/providers - List all task providers for the user
POST /api/tasks/providers - Add a new task provider
GET /api/tasks/providers/:id - Get details for a specific provider
PUT /api/tasks/providers/:id - Update provider settings
DELETE /api/tasks/providers/:id - Delete a provider
```

### Task List Management

```
GET /api/tasks/providers/:providerId/lists - Get available task lists
POST /api/tasks/mappings - Create a new task list mapping
PUT /api/tasks/mappings/:id - Update a mapping
DELETE /api/tasks/mappings/:id - Delete a mapping
```

### Synchronization Operations

```
POST /api/tasks/sync/provider/:providerId - Trigger sync for all lists in a provider
POST /api/tasks/sync/mapping/:mappingId - Trigger sync for a specific mapping
GET /api/tasks/sync/status/:jobId - Check status of a sync job
POST /api/tasks/sync/resolve/:taskId - Resolve a sync conflict
```

## Background Jobs

### Sync Job Processor

Implement a BullMQ job processor for task sync operations:

```typescript
// src/saas/jobs/task-sync-processor.ts
export class TaskSyncProcessor {
  // Process sync job for a specific mapping
  processMappingSync(job: Job): Promise<SyncResult>;

  // Process sync job for an entire provider
  processProviderSync(job: Job): Promise<SyncResult[]>;

  // Schedule periodic sync jobs based on user settings
  schedulePeriodicSync(userId: string): Promise<void>;
}
```

### Sync Queue Setup

```typescript
// src/saas/jobs/queues.ts
export const taskSyncQueue = new Queue("taskSync", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
});
```

## UI Components

### Provider Management UI

```tsx
// src/components/settings/TaskProvidersSettings.tsx
export function TaskProvidersSettings() {
  // UI for managing task providers
  // - List providers
  // - Add/edit/remove providers
  // - Configure sync settings
}
```

### Task List Mapping UI

```tsx
// src/components/tasks/TaskListMappingModal.tsx
export function TaskListMappingModal({ providerId }) {
  // UI for mapping external task lists to projects
  // - Select task list
  // - Select or create project
  // - Configure mapping settings
}
```

### Sync Status UI

```tsx
// src/components/tasks/TaskSyncStatus.tsx
export function TaskSyncStatus() {
  // UI for viewing sync status and errors
  // - Show sync status for each provider
  // - Show last sync time
  // - Show error messages
  // - Manual sync trigger
}
```

### Conflict Resolution UI

```tsx
// src/components/tasks/TaskConflictResolver.tsx
export function TaskConflictResolver({ taskId }) {
  // UI for resolving sync conflicts
  // - Show local vs. remote changes
  // - Options: keep local, use remote, merge
}
```

## Testing Plan

1. **Unit Tests**

   - Task provider interface implementations
   - TaskSyncManager methods
   - Conflict resolution strategies

2. **Integration Tests**

   - End-to-end sync workflows
   - Error handling and recovery
   - API endpoint functionality

3. **Mock External Services**
   - Create mock implementations of external APIs for testing

## Phased Implementation Plan

### Phase 1: Foundation (2-3 weeks) [COMPLETED]

1. Create database schema changes ✅
2. Implement core interfaces and base classes ✅
3. Port existing Outlook Tasks code to new architecture ✅
4. Implement one-way sync from Outlook to FluidCalendar (maintain current functionality) ✅
5. Create basic provider management UI ✅

### Phase 2: Two-Way Sync for Outlook (2-3 weeks) [IN PROGRESS]

1. Implement change tracking system [COMPLETED]

   - ✅ Enhance TaskChangeTracker to record local task changes
   - ✅ Create TaskChange model in database schema
   - ✅ Store timestamp and operation type for each change
   - ✅ Set up efficient change retrieval for sync operations

2. Develop conflict resolution strategies [IN PROGRESS]

   - ⚠️ Implement "latest wins" default strategy
   - Add support for manual conflict resolution
   - Store conflict information in task data

3. Implement task change propagation from FluidCalendar to Outlook [IN PROGRESS]

   - ✅ Add task create/update/delete operations to OutlookProvider
   - ✅ Respect TaskListMapping direction setting during sync
   - ✅ Update TaskSyncManager for bidirectional flow
   - ✅ Update API endpoints to track task changes

4. Create conflict resolution UI

   - Show conflicting task versions
   - Provide options to choose local, remote, or merged version
   - Add visual indicators for conflicted tasks

5. Add background sync jobs
   - Ensure bidirectional sync in background jobs
   - Update job processor to handle conflicts
   - Add configuration for sync frequency

### Phase 3: CalDAV Integration (2-3 weeks)

1. Implement CalDAV task provider
2. Add CalDAV-specific UI components
3. Test two-way sync with various CalDAV servers
4. Document CalDAV setup process

### Phase 4: Production Hardening (1-2 weeks)

1. Add comprehensive error handling
2. Implement retry mechanisms
3. Add detailed logging and monitoring
4. Performance optimization
5. User documentation

### Phase 5: Additional Providers (2-3 weeks per provider)

1. Implement Asana provider
2. Implement additional providers as needed (Todoist, Jira, etc.)
3. Provider-specific UI enhancements

## Success Metrics

1. Sync reliability: >99% successful syncs
2. Sync performance: <30 seconds for typical task list sync
3. User adoption: >50% of users configuring at least one task provider
4. Support inquiries: <5% of sync operations requiring support intervention
