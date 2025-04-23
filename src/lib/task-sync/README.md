# Task Sync System

This document outlines the task synchronization system between FluidCalendar and external task providers such as Outlook, Google Tasks, etc.

## Overview

The task sync system allows users to keep their tasks in sync between FluidCalendar and external task providers. Currently, the system supports one-way sync from external providers to FluidCalendar.

## Sync Behavior

### One-Way Sync (External → FluidCalendar)

The current implementation is a one-way sync that brings tasks from external providers into FluidCalendar while preserving local customizations.

#### Selective Field Sync

To maintain a good user experience, we use a "selective field sync" approach:

- **External-owned fields** are always updated during sync
- **Local-owned fields** are never overwritten during sync

This allows users to customize their tasks in FluidCalendar without worrying about losing those customizations during sync.

#### Field Categories

**External-owned fields** (updated during sync):

- Title
- Description
- Status (todo, completed, etc.)
- Due Date
- Recurrence settings (isRecurring, recurrenceRule)

**Local-owned fields** (preserved during sync):

- Start Date
- Duration
- Priority
- Energy Level
- Preferred Time
- Auto-scheduling settings (isAutoScheduled, scheduleLocked)
- Schedule information (scheduledStart, scheduledEnd)

## How It Works

1. When a sync is triggered (manually or via scheduled job):

   - We fetch all tasks from the external provider for a given list
   - We compare them with existing tasks in our database

2. For new tasks (not in our database):

   - We create them with all fields from the external source
   - Default values are applied for any missing required fields

3. For existing tasks (already in our database):
   - We only update the external-owned fields
   - The local-owned fields are left untouched
   - Sync metadata is updated (lastSyncedAt, syncStatus, etc.)

## Future Plans

In Phase 2, we plan to implement bidirectional sync that will allow changes made in FluidCalendar to be reflected in external providers as well.

## API Endpoints

- `POST /api/task-providers/:providerId/sync` - Trigger sync for a specific provider
- `POST /api/task-list-mappings/:mappingId/sync` - Trigger sync for a specific task list mapping
