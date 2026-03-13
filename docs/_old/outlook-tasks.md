# Outlook Tasks Integration Implementation Plan

## Overview

This document outlines the implementation plan for adding Microsoft Outlook tasks import support to FluidCalendar using the Microsoft Graph API. This integration will enable users to import their Microsoft 365 and Outlook.com tasks as a one-way sync, maintaining task IDs for future reference while keeping the task system independent. Task lists from Outlook will be mapped to projects in the system.

## Implementation Phases

### Phase 1: Core Infrastructure

#### 1. Database Schema Updates

```sql
-- Add externalTaskId and source fields to Task table
ALTER TABLE "Task" ADD COLUMN "externalTaskId" TEXT;
ALTER TABLE "Task" ADD COLUMN "source" TEXT;  -- 'OUTLOOK', 'LOCAL', etc.
ALTER TABLE "Task" ADD COLUMN "lastSyncedAt" TIMESTAMP;

-- Add table to track Outlook list to project mappings
CREATE TABLE "OutlookTaskListMapping" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "externalListId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "lastImported" TIMESTAMP NOT NULL,
  "name" TEXT NOT NULL,
  FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE,
  UNIQUE ("externalListId")
);

-- Add indices
CREATE INDEX "Task_externalTaskId_idx" ON "Task"("externalTaskId");
CREATE INDEX "Task_source_idx" ON "Task"("source");
CREATE INDEX "OutlookTaskListMapping_externalListId_idx" ON "OutlookTaskListMapping"("externalListId");
CREATE INDEX "OutlookTaskListMapping_projectId_idx" ON "OutlookTaskListMapping"("projectId");
```

#### 2. Microsoft Graph API Integration

- Add Tasks.Read scope to existing OAuth configuration
- Update token management to include task permissions
- Create task-specific Graph API client methods

#### 3. Core Interfaces

```typescript
interface OutlookTask {
  id: string;
  title: string;
  status: string;
  importance: string;
  sensitivity: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  isReminderOn: boolean;
  reminderDateTime?: string;
  completedDateTime?: string;
  dueDateTime?: string;
  startDateTime?: string;
  body?: {
    content: string;
    contentType: string;
  };
  recurrence?: {
    pattern: any;
    range: any;
  };
  categories?: string[];
}

interface OutlookTaskList {
  id: string;
  name: string;
  isDefaultFolder: boolean;
  parentGroupKey?: string;
}

interface OutlookTaskListMapping {
  id: string;
  externalListId: string; // Outlook list ID
  projectId: string; // Local project ID
  lastImported: Date;
  name: string; // Original Outlook list name
}

interface TaskImportOptions {
  includeCompleted: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  taskListIds?: string[];
  importCategories: boolean;
}

interface TaskImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: Array<{
    taskId: string;
    error: string;
  }>;
  projectMappings: Array<{
    listId: string;
    listName: string;
    projectId: string;
    projectName: string;
  }>;
}
```

### Phase 2: Core Implementation

#### 1. Task List Management

- [ ] Implement task list discovery
- [ ] Add task list selection UI
- [ ] Store user's task list preferences
- [ ] Implement list to project mapping
- [ ] Handle list/project synchronization

#### 2. Task Import System

- [ ] Create task import service
- [ ] Implement field mapping
- [ ] Handle attachments (skip for v1)
- [ ] Process task categories
- [ ] Convert dates to correct timezone
- [ ] Handle recurring tasks (skip for v1)
- [ ] Map tasks to appropriate projects

#### 3. UI Integration

- [ ] Add import button to tasks view
- [ ] Create import configuration modal
- [ ] Show import progress
- [ ] Display import results
- [ ] Add task source indicator in UI
- [ ] Add project mapping interface
- [ ] Show Outlook list origin in project view

### Phase 3: Testing & Validation

#### 1. Test Cases

- [ ] Task list retrieval
- [ ] Project mapping creation
- [ ] Basic task import
- [ ] Field mapping accuracy
- [ ] Date/time handling
- [ ] Error handling
- [ ] Large task list performance
- [ ] Token refresh during import
- [ ] Project relationship integrity

#### 2. Edge Cases

- [ ] Empty task lists
- [ ] Invalid task data
- [ ] Network interruptions
- [ ] Token expiration
- [ ] Rate limiting
- [ ] Duplicate handling
- [ ] Project deletion handling
- [ ] List remapping scenarios

## Technical Implementation Details

### 1. API Endpoints

#### Task List Discovery

```typescript
GET / api / tasks / outlook / lists;
Response: {
  lists: Array<{
    id: string;
    name: string;
    count: number;
    isDefaultFolder: boolean;
    projectMapping?: {
      projectId: string;
      projectName: string;
      lastImported: string;
    };
  }>;
}
```

#### Task Import

```typescript
POST /api/tasks/outlook/import
Body: {
  listIds: string[];
  options: TaskImportOptions;
  projectMappings?: Array<{
    listId: string;
    projectId?: string;  // If not provided, creates new project
    projectName?: string;  // Used when creating new project
  }>;
}
Response: TaskImportResult
```

### 2. Core Functions

#### Task List Management

```typescript
async function getOutlookTaskLists(accountId: string) {
  const client = await getOutlookClient(accountId);
  return client.api("/me/todo/lists").get();
}

async function createProjectFromList(
  listId: string,
  listName: string,
  accountId: string
): Promise<{ project: Project; mapping: OutlookTaskListMapping }> {
  // Create project and mapping in transaction
  return await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        name: listName,
        description: `Imported from Outlook task list: ${listName}`,
        status: "active",
      },
    });

    const mapping = await tx.outlookTaskListMapping.create({
      data: {
        externalListId: listId,
        projectId: project.id,
        name: listName,
        lastImported: newDate(),
      },
    });

    return { project, mapping };
  });
}
```

#### Task Import

```typescript
async function importOutlookTasks(
  accountId: string,
  listId: string,
  projectId: string,
  options: TaskImportOptions
) {
  const client = await getOutlookClient(accountId);
  const tasks = await client
    .api(`/me/todo/lists/${listId}/tasks`)
    .filter(buildTaskFilter(options))
    .get();

  return await processTaskImport(tasks, projectId, options);
}

async function processTaskImport(
  tasks: OutlookTask[],
  projectId: string,
  options: TaskImportOptions
) {
  const results: TaskImportResult = {
    imported: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const task of tasks) {
    try {
      await prisma.task.create({
        data: {
          ...mapOutlookTask(task),
          projectId,
          externalTaskId: task.id,
          source: "OUTLOOK",
          lastSyncedAt: newDate(),
        },
      });
      results.imported++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        taskId: task.id,
        error: error.message,
      });
    }
  }

  return results;
}
```

### 3. Data Mapping

#### Outlook to Local Task Mapping

```typescript
function mapOutlookTask(outlookTask: OutlookTask): Partial<Task> {
  return {
    title: outlookTask.title,
    description: outlookTask.body?.content,
    dueDate: outlookTask.dueDateTime ? newDate(outlookTask.dueDateTime) : null,
    completed: !!outlookTask.completedDateTime,
    priority: mapPriority(outlookTask.importance),
    status: mapStatus(outlookTask.status),
    externalTaskId: outlookTask.id,
    source: "OUTLOOK",
    lastSyncedAt: newDate(),
  };
}

function mapPriority(importance: string): string {
  switch (importance.toLowerCase()) {
    case "high":
      return "high";
    case "low":
      return "low";
    default:
      return "medium";
  }
}

function mapStatus(outlookStatus: string): TaskStatus {
  switch (outlookStatus.toLowerCase()) {
    case "completed":
      return TaskStatus.COMPLETED;
    case "inProgress":
      return TaskStatus.IN_PROGRESS;
    default:
      return TaskStatus.TODO;
  }
}
```

## Implementation Steps

1. Database Updates

   - [ ] Create migration for new task fields
   - [ ] Create migration for list mapping table
   - [ ] Update task model
   - [ ] Create list mapping model
   - [ ] Add indices for performance

2. API Integration

   - [ ] Add task permissions to OAuth scope
   - [ ] Create task API client class
   - [ ] Implement task list endpoints
   - [ ] Create import endpoint
   - [ ] Add list mapping endpoints

3. Core Logic

   - [ ] Implement task mapping
   - [ ] Create import service
   - [ ] Add error handling
   - [ ] Implement progress tracking
   - [ ] Add project mapping logic
   - [ ] Handle list synchronization

4. UI Components

   - [ ] Add import button
   - [ ] Create import modal
   - [ ] Add progress indicator
   - [ ] Show import results
   - [ ] Update task list view
   - [ ] Add project mapping interface
   - [ ] Show Outlook source indicators

5. Testing
   - [ ] Unit tests for mapping
   - [ ] Integration tests
   - [ ] Error case testing
   - [ ] Performance testing
   - [ ] Project mapping tests

## Future Considerations

1. Potential Enhancements

   - Two-way sync capability
   - Real-time updates
   - Attachment support
   - Recurring task support
   - Bulk import improvements
   - Category/tag mapping
   - Advanced project mapping options
   - List hierarchy support

2. Performance Optimizations

   - Batch processing
   - Parallel imports
   - Incremental updates
   - Caching improvements
   - Efficient project mapping queries

3. User Experience
   - Better progress indicators
   - Detailed error reporting
   - Import scheduling
   - Custom field mapping
   - Project template support
   - List organization tools

## Security Considerations

1. Token Management

   - Secure storage
   - Proper refresh
   - Scope validation

2. Data Protection
   - Sensitive task handling
   - Private information
   - User data isolation
   - Project access control

## Error Handling

1. Common Scenarios

   - Network failures
   - Token expiration
   - Rate limiting
   - Invalid data
   - Duplicate tasks
   - Project mapping conflicts

2. Recovery Strategies
   - Retry logic
   - Partial import recovery
   - Error reporting
   - User notifications
   - Mapping restoration

## Dependencies

1. Required Packages

   - @microsoft/microsoft-graph-client
   - date-fns-tz
   - zod (for validation)

2. API Requirements
   - Microsoft Graph API v1.0
   - Tasks.Read permission
   - User.Read permission

## Documentation Requirements

1. User Documentation

   - Import process
   - Configuration options
   - Project mapping guide
   - Troubleshooting
   - Limitations

2. Developer Documentation
   - API usage
   - Data models
   - Error handling
   - Extension points
   - Project mapping patterns
