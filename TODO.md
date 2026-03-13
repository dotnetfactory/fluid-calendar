# FluidCalendar SaaS - TODO List

## 🔴 CRITICAL ISSUES (Fix Immediately)

### System Stability
- [x] **Auto-scheduling creating tasks in the past** (off by one day bug)
- [ ] **Auto-scheduling not prioritizing high priority tasks first**
- [ ] **Synced tasks are not set to auto-schedule by default**
- [ ] **Hide upcoming tasks not working**
- [ ] **Project sidebar edit/sync not shown properly in production** when project name is too long
- [ ] **Pending waitlist** - need a way to resend emails with new tokens or for users that signup again to get a new email
- [ ] page title always says loading fluid calendar
- [ ] google sync in prod not working
- [ ] does the server sync automatically?
- [ ] improve calendar grouping in sidebar by account
- [ ] allow me to set account name
- [ ] trials are not expiring
- [ ] pSEO
- [ ] 

### Performance Issues
- [ ] **Event creation slows down significantly** due to sync operations (API should just create in database)
- [ ] **Cache invalidation needed** - check cache when calendars or events change (sync or CRUD operations)
- [ ] **Auto-schedule UI issue** - clicking auto-schedule shows blank list, requires page refresh

### Calendar Sync Critical Bugs
- [ ] **Deleting recurring event from quickview** doesn't work well, doesn't ask series vs instance
- [ ] **Google Calendar: deleting one event from series** deletes all instances locally
- [ ] **Recurring event deletion** shows random instance behavior, inconsistent sync

## 🟡 HIGH PRIORITY (Next Sprint)

### Security & Configuration
- [ ] **Secure Redis with password authentication**
- [ ] **Implement rate limiting for job creation**
- [ ] **Save task completed date and sync it with Outlook**

### Missing Core Features
- [ ] **Sync status indicators** throughout the UI
  - [ ] Add visual indicators for sync status in task components
  - [ ] Display last sync time and status in project details
  - [ ] Create toast notifications for sync events
- [ ] **Task conflict resolution** for bidirectional sync
  - [ ] Implement conflict detection mechanisms
  - [ ] Create conflict resolution strategies (latest wins, merge, manual)
  - [ ] Add API endpoints for conflict resolution

### UI/UX Critical Issues
- [ ] **Fix keyboard shortcuts in focus mode**
- [ ] **Make tags more obvious when selected** in task modal
- [ ] **Show spinner when deleting/creating/updating** events
- [ ] **Prevent adding events to read-only calendars**

## 🟠 MEDIUM PRIORITY (This Quarter)

### Testing & Quality Assurance
- [ ] **Write unit tests for job processors**
- [ ] **Write integration tests for job queue**
- [ ] **Test email delivery**
- [ ] **Add comprehensive test coverage** for user management features

### Documentation
- [ ] **Document job system architecture**
- [ ] **Create developer guide for adding new job types**
- [ ] **Document admin interface usage**
- [ ] **Update deployment documentation**
- [ ] **Document user management feature in README**

### Calendar Features
- [ ] **Allow changing calendar color**
- [ ] **Allow calendar re-ordering in the UI**
- [ ] **Add ability to RSVP to events**
- [ ] **Show events not RSVPed to**
- [ ] **Support attendees in calendar events**
- [ ] **Support event notifications**

### Task Management Enhancements
- [ ] **Task dependencies**
- [ ] **Recurring tasks don't indicate that it's recurring**
- [ ] **Ability to add tasks in calendar view**
- [ ] **Use AI to break down tasks**

### System Maintenance
- [ ] **Cron job to cleanup logs**
- [ ] **Cron job to expire waitlist verifications**
- [ ] **Create dashboard for job system health**

### Admin Interface
- [ ] **View job details functionality**
- [ ] **Implement pagination controls** with page numbers and better UI for waitlist table
- [ ] **Implement modal dialogs for bulk actions** in admin interface

## 🟢 LOW PRIORITY (Future)

### Feature Enhancements
- [ ] **Add calculator comparing Motion to FluidCalendar**
- [ ] **Add sidebar in open version to promote SaaS**
- [ ] **Auto schedule working hours using 24hr format** instead of AM/PM
- [ ] **Use task-reminder job for sending reminders**
- [ ] **Add localization for date formatting**
- [ ] **Share availability feature**
- [ ] **Use SSE throughout to improve sync performance**
- [ ] **Use database for system config instead of Infisical**

### Code Quality Improvements
- [ ] **Move utility functions to separate utils files** (TaskModal.tsx, EventQuickView.tsx)
- [ ] **Create shared TypeScript types** for user management interfaces
- [ ] **Implement clear data functionality** in DataSettings

### Advanced Calendar Features
- [ ] **CalDAV collections support**
- [ ] **Handle different calendar permissions**
- [ ] **Implement free/busy status**
- [ ] **Add support for calendar sharing**
- [ ] **Two-way calendar sync with change tracking**

### Focus Mode Enhancements
- [ ] **Add focus session analytics**
  - [ ] Track time spent in focus mode
  - [ ] Record tasks completed per session
  - [ ] Visualize productivity patterns
- [ ] **Implement custom focus modes**
  - [ ] Deep work mode (2+ hour sessions)
  - [ ] Quick task mode (15-30 minute sessions)
  - [ ] Meeting preparation mode
- [ ] **Add Pomodoro technique integration**
  - [ ] Configurable work/break intervals
  - [ ] Break reminders
  - [ ] Session statistics

### Task Synchronization Phase 2
- [ ] **Implement Google Tasks provider**
- [ ] **Add more external task providers**
- [ ] **Implement full sync logic** (vs. incremental sync)
- [ ] **Add sync scheduling** based on provider settings
- [ ] **Implement proper error handling and notification system**

### Performance Optimization
- [ ] **Implement virtualization for long lists**
- [ ] **Add lazy loading for views**
- [ ] **Optimize re-renders**
- [ ] **Add request caching**
- [ ] **Implement optimistic updates**
- [ ] **Add error boundaries**

### Email System
- [ ] **Schedule invitations for future sending**
- [ ] **Daily email implementation enhancements**

## ✅ COMPLETED TASKS

### User Management System (Recently Completed)
- [x] Add createdAt and updatedAt timestamps to User and Account models
- [x] Create database migration for timestamps
- [x] Update User management API to use real timestamps
- [x] Update UserTable component to display real signup dates
- [x] Test the updated user management interface
- [x] Remove unused Session table from database

### Task Sync Phase 1 (Completed)
- [x] Create the `TaskProvider` model in schema.prisma
- [x] Create the `TaskListMapping` model to replace `OutlookTaskListMapping`
- [x] Create the `TaskSync` model
- [x] Add indexes for efficient lookup
- [x] Update the `Task` model with additional sync fields
- [x] Update the `Project` model with sync-related fields
- [x] Create a migration for the schema changes
- [x] Create core interfaces and classes for task sync
- [x] Create Outlook Provider Implementation
- [x] Create API endpoints for provider management
- [x] Set up BullMQ job queue for task synchronization
- [x] Create settings UI for task providers
- [x] Build task list mapping UI
- [x] Implement comprehensive error handling in UI
- [x] Test complete workflow from adding provider to auto-syncing tasks
- [x] Enhance TaskChangeTracker to record local task changes
- [x] Create TaskChange database model for change tracking
- [x] Update API endpoints to track task changes
- [x] Update TaskSyncManager to support bidirectional sync flow
- [x] Implement change detection comparing local and remote task states
- [x] Add methods to push local changes to providers
- [x] Update OutlookProvider with create/update/delete task methods
- [x] Update TaskListMapping to respect sync direction setting
- [x] Verify one-way sync functionality

### Background Jobs Implementation (Completed)
- [x] Add Redis StatefulSet to Kubernetes configuration
- [x] Add Redis Service to Kubernetes configuration
- [x] Create worker deployment configuration in Kubernetes
- [x] Update GitHub Actions workflow to deploy Redis and worker
- [x] Install required packages: `bullmq`, `ioredis`, `cron`
- [x] Create Redis connection configuration
- [x] Set up queue definitions
- [x] Create worker entry point
- [x] Create base job processor class
- [x] Implement calendar sync processor
- [x] Implement email processor
- [x] Implement task reminder processor
- [x] Create email template for daily summary
- [x] Implement daily summary job processor
- [x] Set up scheduled job to trigger daily summary emails
- [x] Create job status database schema in Prisma
- [x] Implement job tracking and logging
- [x] Create admin dashboard UI for jobs
- [x] Implement job status viewing and filtering
- [x] Add manual job triggering functionality
- [x] Create test environment with Redis
- [x] Create staging Kubernetes configuration
- [x] Set up separate Redis instance for staging
- [x] Configure GitHub Actions workflow for staging deployment
- [x] Set up staging domain (staging.fluidcalendar.com)
- [x] Configure Infisical for staging environment
- [x] Test background jobs in staging environment
- [x] Implement job performance metrics
- [x] Set up error alerting for failed jobs
- [x] Configure log aggregation for job system
- [x] Add validation for job input data
- [x] Ensure secure handling of user data in jobs

---

## Notes

### Priority Legend
- 🔴 **CRITICAL**: System broken, users affected, fix immediately
- 🟡 **HIGH**: Important features, security issues, next sprint
- 🟠 **MEDIUM**: Enhancements, quality improvements, this quarter  
- 🟢 **LOW**: Nice to have, future considerations

### Related Files
- Check Reddit feedback: https://www.reddit.com/r/selfhosted/comments/1irj353/comment/mjgcajo/
- See [sync document](docs/task-sync.md) for 2-way task sync details
- See [tasklist](docs/tasklist-enhancements.md) for task list improvements

### Next Review Date
This TODO list should be reviewed and updated monthly or after major releases.