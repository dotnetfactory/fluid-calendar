# Changelog

All notable changes to this project will be documented in this file.
## [unreleased]

## [1.2.3]
### Added
- Added task start date feature to specify when a task should become active
  - Tasks with future start dates won't appear in focus mode
  - Auto-scheduling respects start dates, not scheduling tasks before their start date
  - Visual indicators for upcoming tasks in task list view
  - Filter option to hide upcoming tasks
  - Ability to sort and filter by start date
- Added week start day setting to Calendar Settings UI to allow users to choose between Monday and Sunday as the first day of the week
- Expanded timezone options in user settings to include a more comprehensive global list fixes #68
- Bulk resend invitations functionality for users with INVITED status
- Added "Resend Invitation" button to individual user actions in waitlist management

### Changed
- Replaced Google Fonts CDN with self-hosted Inter font to fix intermittent build failures
- Updated waitlist entries sorting to include secondary sorting by priorityScore and createdAt

### Fixed
- Fixed all-day events appearing on the wrong day for Google Calendar events due to timezone handling issues
- Fixed Outlook all-day event creation that was failing due to Outlook requiring exact midnight UTC times
- Fixed Outlook all-day events requiring a minimum 24-hour duration by automatically extending single-day events to end on the next day at midnight
- Fixed Outlook all-day events displaying on the wrong day in the calendar due to incorrect date conversion during sync
- Fixed startDate handling for recurring tasks, ensuring the time interval between start date and due date is preserved when creating new instances
- Fixed timezone inconsistency in task list display for start dates and due dates
- Fixed DatePicker showing incorrect dates (off by one day) when inline editing due dates and start dates
- Fixed CalDAV all-day event creation failing with "invalid date-time value" error by properly using ICAL.Time.fromDateString instead of raw string dates

## [1.2.2] 2025-03-18
### Added
- Added rate limiting to email queue to limit processing to 2 emails per second
- Added additional logging to email processor to monitor rate limiting effectiveness
- Added ability to manually retry failed jobs from the admin jobs interface
- Added View Details button to jobs in the admin interface to inspect job data, results, and errors
- Added lifetime subscription interest tracking to waitlist system
  - Implemented `interestedInLifetime` flag in Waitlist and PendingWaitlist models
  - Added admin notification emails when users express interest in lifetime subscription
  - Updated waitlist API to handle lifetime subscription interest
- Added background task scheduling system with real-time notifications
  - Implemented task scheduling queue with BullMQ for asynchronous processing
  - Added debouncing mechanism to prevent duplicate scheduling jobs
  - Created SSE (Server-Sent Events) endpoint with Redis-backed notifications
  - Integrated with existing notification system for toast messages
  - Added fallback to direct scheduling for open source version without Redis
- Docker image now available on GitHub Container Registry (ghcr.io)
- GitHub workflow for automatic Docker image publication
- Documentation for using the Docker image in README.md
- Added `scripts/sync-repos-reverse.sh` for syncing changes from open source repository back to SAAS repository
- Added data retention and deletion information to privacy policy to comply with Google's app verification requirements

### Changed
- Modified job retry functionality to update existing job records instead of creating new ones
- Updated email templates to use "FluidCalendar" instead of "Fluid Calendar" for consistent branding
- Refactored task scheduling logic into a common service to reduce code duplication
  - Created `TaskSchedulingService` with shared scheduling functionality
  - Updated both API route and background job processor to use the common service
- Improved SAAS/open source code separation
  - Moved SAAS-specific API routes to use `.saas.ts` extension
  - Renamed NotificationProvider to NotificationProvider.saas.tsx
  - Relocated NotificationProvider to SAAS layout for better code organization
  - Updated client-side code to use the correct endpoints based on version

### Fixed
- Fixed type errors in the job retry API by using the correct compound unique key (queueName + jobId)
- Fixed database connection exhaustion issue in task scheduling:
  - Refactored SchedulingService to use the global Prisma instance instead of creating new connections
  - Updated CalendarServiceImpl and TimeSlotManagerImpl to use the global Prisma instance
  - Added proper cleanup of resources in task scheduling API route
  - Resolved "Too many database connections" errors in production

## [1.2.1] 2025-03-13
### Added
- Added login button to SAAS home page that redirects to signin screen or app root based on authentication status
- Added SessionProvider to SAAS layout to support authentication state across SAAS pages
- Added pre-commit hooks with husky and lint-staged to run linting and type checking before commits

### Changed
- Removed Settings option from the main navigation bar since it's already available in the user dropdown menu
- Improved dark mode by replacing black with dark gray colors for better visual comfort and reduced contrast

### Fixed
- Fixed event title alignment in calendar events to be top-aligned instead of vertically centered
- Removed minimum height constraint for all-day events in WeekView and DayView components to improve space utilization
- Made EventModal and TaskModal content scrollable on small screens to ensure buttons remain accessible

## [1.2.0] 2025-03-13
### Added
- Added background job processing system with BullMQ
  - Implemented BaseProcessor for handling job processing
  - Added DailySummaryProcessor for generating and sending daily summary emails
  - Added EmailProcessor for sending emails via Resend
  - Created job tracking system to monitor job status in the database
- Added admin interface for job management
  - Created admin jobs page with statistics and job listings
  - Added ability to trigger daily summary emails for testing
  - Implemented toast notifications for user feedback
- Added Toaster component to the saas layout and admin layout
- Added Redis configuration for job queues
- Added Prisma schema updates for job records
- Added worker process for background job processing
  - Created worker.ts and worker.cjs for running the worker process
  - Added run-worker.ts script for starting the worker
- Added Kubernetes deployment configuration for the worker
- Added Docker configuration for the worker
- Added date utilities for handling timezones in job processing
- Added maintenance job system for database cleanup
  - Implemented MaintenanceProcessor for handling system maintenance tasks
  - Added daily scheduled job to clean up orphaned job records
  - Created cleanup logic to mark old pending jobs as failed
- Centralized email service that uses the queue system for all email sending
- Task reminder processor and templates for sending task reminder emails
- Email queue system for better reliability and performance

### Fixed
- Fixed TypeScript errors in the job processing system:
  - Replaced `any` types with proper type constraints in BaseProcessor, job-creator, and job-tracker
  - Added proper type handling for job data and results
  - Fixed handling of undefined values in logger metadata
  - Added proper error handling for Prisma event system
  - Fixed BullMQ job status handling to use synchronous properties instead of Promise-returning methods
  - Added proper null fallbacks for potentially undefined values
  - Fixed type constraints for job data interfaces
  - Added proper type casting with eslint-disable comments where necessary
- Fixed meeting and task utilities to use proper date handling
- Fixed worker deployment in CI/CD pipeline
- Fixed job ID uniqueness issues by implementing UUID generation for all queue jobs
  - Resolved unique constraint violations when the same job ID was used across different queues
  - Replaced console.log calls with proper logger usage in worker.ts
- Fixed job tracking reliability issues
  - Reordered operations to create database records before adding jobs to the queue
  - Improved error handling and logging for job tracking operations
  - Added automated cleanup for orphaned job records
- Improved error handling in email sending process
- Reduced potential for rate limiting by queueing emails

### Changed
- Updated job tracking system to be more robust:
  - Improved error handling in job tracker
  - Added better type safety for job data and results
  - Enhanced logging with proper null fallbacks
  - Improved job status detection logic
  - Changed job creation sequence to ensure database records exist before processing begins
  - Added daily maintenance job to clean up orphaned records
- Updated GitHub workflow to include worker deployment
- Updated Docker Compose configuration to include Redis
- Updated package.json with new dependencies for job processing
- Updated tsconfig with worker-specific configuration
- Refactored date utilities to be more consistent
- Improved API routes for job management
- Enhanced admin interface with better job visualization
- Refactored all direct email sending to use the queue system
- Updated waitlist email functions to use the new email service

### Technical Debt
- Added proper TypeScript types to replace `any` types
- Added eslint-disable comments only where absolutely necessary
- Fixed linter and TypeScript compiler errors
- Improved code maintainability with better type definitions
- Added documentation for the job processing system
- Standardized error handling across the codebase
