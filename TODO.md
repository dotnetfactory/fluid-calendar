# IMPORTANT

- pending waitlist - need a way to resend emails with new tokens or for users that signup again to get a new email
- synced tasks are not set to auto-schedule by default
- hide upcoming tasks not working
- project sidebar edit/sync not shown properly in production when project name is too long
- check out this comment https://www.reddit.com/r/selfhosted/comments/1irj353/comment/mjgcajo/?%24deep_link=true&correlation_id=ca91f555-ee0e-5331-bd75-473ac484ff09&ref=email_comment_reply&ref_campaign=email_comment_reply&ref_source=email&%243p=e_as&_branch_match_id=1262094978557361170&utm_medium=Email+Amazon+SES&_branch_referrer=H4sIAAAAAAAAA32O0WqEMBBFv8Z9U1djut2ClELb3wjZZKJjYxImEelLv70j9bkwgZs75zJ3LiXll7YlsBZLo1NqPIavVqTXqh9EGkHpfGEZCScM2quN%2FDgfqUq8Vf0nz77vzZk3cWWD%2BGXwbo65gOUP2yuEkll2SIuQgpXzG1qjPQSrSWFWIe4qJggqx40MMLIuk9FLPM4IviT7wQIkdTSsxHuhjaEnE4nA64IxKLTsG33vnJSyBrhCLYXo6oe9yXq4CW2G58G5651zBI5hWDV6dRZUBMl%2F%2F%2B2U0WvSOIV%2FobPqiVx%2B2AMiDJN6UNwz0PhhJ%2FgFVuHGA2YBAAA%3D
-

## Task Sync Phase 1 Tasks

1. **Database Schema Changes**

   - [x] Create the `TaskProvider` model in schema.prisma
   - [x] Create the `TaskListMapping` model to replace `OutlookTaskListMapping`
   - [x] Create the `TaskSync` model
   - [x] Add indexes for efficient lookup
   - [x] Update the `Task` model with additional sync fields
   - [x] Update the `Project` model with sync-related fields
   - [x] Create a migration for the schema changes

2. **Core Interfaces and Classes**

   - [x] Create `src/lib/task-sync/providers/task-provider.interface.ts`
   - [x] Create `src/lib/task-sync/task-sync-manager.ts`
   - [x] Create `src/lib/task-sync/task-change-tracker.ts`
   - [x] Create helper utilities for mapping between providers
   - [x] Fix TypeScript type issues in task sync related files

3. **Outlook Provider Implementation**

   - [x] Create `src/lib/task-sync/providers/outlook-provider.ts`
   - [x] Port existing functionality from `OutlookTasksService`
   - [x] Implement the one-way sync from Outlook to FluidCalendar
   - [ ] Add support for task list mapping

4. **API Endpoints**

   - [x] Create provider management endpoints
   - [x] Create mapping management endpoints
   - [x] Create sync trigger endpoints
   - [x] Update API endpoints to follow project authentication patterns
   - [x] Implement task list fetching endpoint for external providers

5. **Background Jobs**

   - [x] Set up BullMQ job queue for task synchronization
   - [x] Create job processor for task sync operations
   - [x] Fix TypeScript issues in task sync processor
   - [x] Implement scheduler for periodic sync jobs

6. **UI Components**

   - [x] Create settings UI for task providers
   - [x] Build task list mapping UI
   - [x] Add provider account email resolution for better user experience
   - [ ] Add sync status indicators
   - [x] Implement comprehensive error handling in UI

7. **Data Migration** (No longer needed - decided to skip migration)

   - ~~[x] Write migration script to move existing Outlook task mappings~~
   - ~~[x] Create admin API endpoint to trigger migration~~
   - ~~[x] Create admin UI for triggering and monitoring migration~~

8. **Next Steps**
   - [x] Test complete workflow from adding provider to auto-syncing tasks
   - [ ] Implement sync status indicators
     - [ ] Add visual indicators for sync status in task components
     - [ ] Display last sync time and status in project details
     - [ ] Create toast notifications for sync events
   - [ ] Implement bi-directional sync (Phase 2)
     - [x] Enhance TaskChangeTracker to record local task changes
     - [x] Create TaskChange database model for change tracking
     - [x] Update API endpoints to track task changes
     - [x] Update TaskSyncManager to support bidirectional sync flow
     - [x] Implement change detection comparing local and remote task states
     - [x] Add methods to push local changes to providers
     - [x] Update OutlookProvider with create/update/delete task methods
     - [x] Update TaskListMapping to respect sync direction setting
     - [ ] Implement conflict detection mechanisms
     - [ ] Create conflict resolution strategies (latest wins, merge, manual)
     - [ ] Add API endpoints for conflict resolution
     - [ ] Test bidirectional sync with various scenarios
   - [ ] Add Google Tasks provider (Phase 2)
   - [x] Verify one-way sync functionality

# FluidCalendar Implementation Plan

# Random Tasks

- [ ] 2-way task sync see [sync document](docs/task-sync.md)
- [ ] add a calculator comparing motion to FC
- [ ] add a sidebar thingy in open to tell them to move to saas
- [ ] auto schedule working hours in settings using 24 instead am/pm
- [ ] improve task lists and focus view see [tasklist](docs/tasklist-enhancements.md)
  - [ ] add view for scheduled tasks and over due or saved views
- [ ] use task-reminder job for sending reminders
- [ ] cron job to cleanup logs
- [ ] cron job to expire waitlist verifications
- [ ] support attendees
- [ ] support event notifications
- [ ] add localization for date formatting
- [ ] share availability
- [ ] use SSE throughout to improve sync performance
- [ ] use database for sysconfig instead of infisical

# CalDAV Implementation

## Phase 3: Calendar Synchronization (Pending)

- [ ] Implement two-way sync with change tracking

## Phase 4: Advanced Features (Pending)

- [ ] Support for CalDAV collections
- [ ] Handle different calendar permissions
- [ ] Implement free/busy status
- [ ] Add support for calendar sharing

# Focus Mode

# Focus Mode

## Focus Mode Implementation

- [ ] fix keyboard shortcuts
- [ ] in taskmodal make the tags more obvious if they are selected
- [ ] Daily Email

# BUG

- [ ] if i have a bunch of tasks that have isautoscheduled false and i click autoschedule the UI updates with a blank list because no tasks are returned. i have to refresh the page to get the tasks.
- [ ] auto scheduling is creating task in the past (it might be off by one day)
- [ ] auto scheduling did not schedule high priority tasks first
- [ ] save task completed date and sync it with outlook
- [ ] deleteing a recurring event from quickview doens't work well and doesn't ask me if i want to delete the series or just the instance.

# Misc

# Misc

## Next Steps

- [ ] Integrate google calendar
  - [ ] auto sync with webhooks
  - [ ] when deleting one event from the series, it deletes all instances locally but google is working fine.
- [ ] prevent adding events to read-only calendars
- [ ] allow changing calendar color
- [ ] allow calendar re-ordering in the UI
- [ ] when deleting a recurring event, it deletes all instances but it shows a random instance which disappears after a sync, also i tried it again and it only deleted the instance locally but the entire series deleted from google.
- [ ] add ability to RSVP
- [ ] show events not RSVPed to
- [ ] show spinner when deleting/creating/updating in event modal
- [ ] Use AI to break down tasks
- [ ] recurring tasks don't indicate that it's recurring
- [ ] Ability to add tasks in calendar view

## Focus Mode Enhancements (Future)

- [ ] Add focus session analytics
  - [ ] Track time spent in focus mode
  - [ ] Record tasks completed per session
  - [ ] Visualize productivity patterns
- [ ] Implement custom focus modes
  - [ ] Deep work mode (2+ hour sessions)
  - [ ] Quick task mode (15-30 minute sessions)
  - [ ] Meeting preparation mode
- [ ] Add Pomodoro technique integration
  - [ ] Configurable work/break intervals
  - [ ] Break reminders
  - [ ] Session statistics

## Outlook sync issues

- [ ] deleting one instance doesn't sync correctly
- [ ] add real-time updates with webhooks
- [ ] implement offline support

## Tasks

- [ ] task dependencies

## 1. Core Calendar Features

- [ ] Calendar Grid Component
  - [ ] Add month view layout
  - [ ] Implement day view layout
  - [ ] Add navigation between days/weeks/months

## 2. Task Management

- [ ] Task Data Structure
  - [ ] Define task interface (title, description, date, duration, status, etc.)
  - [ ] Create task store using Zustand
  - [ ] Implement CRUD operations for tasks
- [ ] Task UI Components
  - [ ] Create task card component
  - [ ] Add task creation modal
  - [ ] Implement task edit modal
  - [ ] Add task details view
  - [ ] Create task list view in sidebar

## 3. Drag and Drop Features

- [ ] Task Rescheduling
  - [ ] Enable drag and drop between time slots
  - [ ] Add visual feedback during drag
  - [ ] Implement time snapping
  - [ ] Handle task duration during drag
- [ ] Task List Reordering
  - [ ] Allow reordering in list view
  - [ ] Sync order changes with store

## 4. Smart Features

- [ ] Task Auto-scheduling
  - [ ] Implement algorithm for finding free time slots
  - [ ] Add priority-based scheduling
  - [ ] Consider task dependencies
- [ ] Time Blocking
  - [ ] Add ability to block out time
  - [ ] Create different block types (focus, meeting, break)
  - [ ] Allow recurring blocks

## 5. Data Persistence

- [ ] Local Storage
  - [ ] Save tasks to localStorage
  - [ ] Implement data migration strategy
- [ ] State Management
  - [ ] Set up Zustand stores
  - [ ] Add undo/redo functionality
  - [ ] Implement data synchronization

## 6. UI/UX Improvements

- [ ] Animations
  - [ ] Add smooth transitions between views
  - [ ] Implement task drag animation
  - [ ] Add loading states
- [ ] Keyboard Shortcuts
  - [ ] Navigation shortcuts
  - [ ] Task creation/editing shortcuts
  - [ ] View switching shortcuts
- [ ] Responsive Design
  - [ ] Mobile-friendly layout
  - [ ] Touch interactions
  - [ ] Adaptive UI based on screen size

## 7. Advanced Features

- [ ] Dark Mode
  - [ ] Implement theme switching
  - [ ] Add system theme detection
- [ ] Calendar Integrations
  - [ ] Google Calendar sync
  - [ ] iCal support
  - [ ] External calendar subscriptions
- [ ] Task Categories
  - [ ] Add custom categories
  - [ ] Color coding
  - [ ] Category-based filtering

## 8. Performance Optimization

- [ ] Component Optimization
  - [ ] Implement virtualization for long lists
  - [ ] Add lazy loading for views
  - [ ] Optimize re-renders
- [ ] State Management
  - [ ] Add request caching
  - [ ] Implement optimistic updates
  - [ ] Add error boundaries

## 9. Testing

- [ ] Unit Tests
  - [ ] Test core utilities
  - [ ] Test state management
  - [ ] Test UI components
- [ ] Integration Tests
  - [ ] Test user flows
  - [ ] Test data persistence
  - [ ] Test drag and drop functionality

## 10. Documentation

- [ ] Code Documentation
  - [ ] Add JSDoc comments
  - [ ] Document component props
  - [ ] Create usage examples
- [ ] User Documentation
  - [ ] Write user guide
  - [ ] Add keyboard shortcut reference
  - [ ] Create onboarding guide

## Implementation Order:

1. Database schema and migrations
2. Core logger service updates
3. API endpoints
4. Settings UI and commands
5. Testing and documentation

## Next Steps

1. Implement the calendar grid component
2. Add basic task management
3. Implement drag and drop functionality
4. Add data persistence
5. Enhance UI with animations and responsive design

## Calendar Sync and Auto-scheduling

- [ ] Implement background sync system
  - [ ] Create useCalendarSync custom hook
  - [ ] Add sync status indicators in UI
  - [ ] Implement error handling and retry logic
  - [ ] Add manual sync trigger to command registry
  - [ ] Add sync preferences to settings
  - [ ] Implement proper cleanup on unmount
  - [ ] Add visual indicators for sync status
  - [ ] Add sync error notifications

## Task Synchronization Phase 2 Next Steps

- [x] Implement bidirectional sync capability (FC ↔ Provider)
- [x] Add UI for changing sync direction
- [x] Update sync controller to handle direction parameter
- [ ] Implement conflict resolution strategies for bidirectional sync
- [ ] Add change tracking for local tasks to support outgoing sync
- [ ] Add TaskSyncManager methods for external task operations
- [ ] Implement full sync logic (vs. incremental sync)
- [ ] Add sync scheduling based on provider settings
- [ ] Implement proper error handling and notification system
- [ ] Add proper status tracking and display in UI
