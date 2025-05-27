# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Complete tRPC v11 Migration Infrastructure**: Established comprehensive tRPC setup with React Query integration
  - Server setup with context creation, procedures (public, protected, admin), and error handling
  - Client setup with httpBatchLink, superjson transformer, and React Query integration
  - Root router system for combining domain-specific sub-routers
  - API handler with fetchRequestHandler for Next.js App Router compatibility
- **Tags Domain Migration to tRPC**: Complete migration of tags functionality from REST API to tRPC
  - Migrated all tag operations (CRUD) to tRPC procedures
  - Created business logic layer with proper validation and error handling
  - Implemented tRPC router with protected procedures for authentication
  - Added comprehensive input validation using Zod schemas
  - Created test component to verify tRPC integration works correctly
  - Removed old REST API routes: `/api/tags` and `/api/tags/[id]`
- **Projects Domain Migration to tRPC**: Complete migration of projects functionality from REST API to tRPC

  - Migrated all project operations (CRUD) to tRPC procedures
  - Created business logic layer with proper validation and error handling
  - Implemented tRPC router with protected procedures for authentication
  - Added comprehensive input validation using Zod schemas
  - Created test component to verify tRPC integration works correctly
  - Removed old REST API routes: `/api/projects` and `/api/projects/[id]`

- Added a button to mark tasks as completed directly from the task quick view popup
- Added visual indicator for externally synced tasks in task list view
- Added Stripe configuration file (`src/lib/stripe.saas.ts`) for SAAS payment processing
- Lifetime access purchase feature
  - Added Stripe integration for one-time payments
  - Implemented early bird 50% discount for first 50 purchases
  - Added lifetime access status tracking for users
  - Created webhook handler for Stripe events
  - Added server actions and API routes for purchase flow
- Lifetime access subscription plan with special early bird pricing
- Server actions for handling lifetime access purchases
- Early bird discount for first 50 lifetime subscribers ($200 instead of $400)
- Lifetime Access subscription plan with early bird pricing
  - Early bird offer: $200 for first 50 subscribers
  - Regular price: $400 after early bird period
  - Includes all Pro features with perpetual access
- Lifetime subscription success page with modern design and animations
- New reusable PageHeader component for consistent page headers
- Enhanced payment success flow with session verification
- New success page for lifetime subscription purchases
- API endpoint to verify Stripe checkout sessions
- Refactored the lifetime subscription success page (`src/app/(saas)/subscription/lifetime/success/page.tsx`) to use the new pattern for `searchParams` and `params` as Promise types, updating usages accordingly.
- Added a password setup page at /subscription/lifetime/setup-password for new users after successful payment (SAAS only).
- Updated the 'Set Up Your Account' button on the lifetime success page to redirect to the password setup page.
- The 'Set Up Your Account' button now sends name and email in query params to the password setup page, which displays them if present.
- Implemented backend API route and service for password setup at /subscription/lifetime/setup-password/api (SAAS only).
- Added client service to call the backend API for password setup.
- Integrated password setup form with the backend using Tanstack Query, including loading, error, and success states.
- Made `/subscription/lifetime/success` route public in middleware so it no longer requires authentication after successful payment.
- Made `/subscription/lifetime/setup-password` route public in middleware so users can set their password after payment without authentication.
- Enhanced lifetime subscription success page with automatic user verification and redirection
- Added subscription status verification and automatic updates for existing users
- Improved payment verification with early bird discount detection
- Updated LifetimeSuccessPage and LifetimeSuccessClient to show 'Go to login' or 'Go to Calendar' for existing users after successful lifetime subscription payment, based on whether the user is logged in or not. The setup button is now only shown for new users.
- Added a dismissible "Buy Lifetime Access" banner at the top of the main calendar/dashboard view for SAAS users who have not purchased lifetime access. The banner links to /beta for payment.
- The "Upgrade to Lifetime Access" banner is now only shown if the user does not have a lifetime subscription. Added `/api/subscription/lifetime/status` endpoint for this check.
- Fixed "Upgrade to Lifetime Access" banner to remain hidden initially until verification confirms user doesn't have lifetime access, preventing banner flash for lifetime subscribers
- Added Asia/Karachi to the timezone options in user settings
- Improved calendar rendering performance with Server Components
  - Added server-side pre-fetching of calendar feeds and events data
  - Modified client components to hydrate with server-fetched data
  - Reduced client-side data loading operations and API calls
  - Eliminated loading delay for initial calendar view rendering
- **tRPC Migration Progress**: Successfully migrated Logs, Import/Export, Auth, and Settings Homepage domains to tRPC v11
  - **Logs Domain (5 routes)**: Complete migration with admin-only access controls
    - GET/DELETE `/api/logs` → `trpc.logs.get` / `trpc.logs.delete`
    - POST `/api/logs/batch` → `trpc.logs.batch` (public access for internal logging)
    - POST `/api/logs/cleanup` → `trpc.logs.cleanup`
    - GET/PUT `/api/logs/settings` → `trpc.logs.getSettings` / `trpc.logs.updateSettings`
    - GET `/api/logs/sources` → `trpc.logs.getSources`
  - **Import/Export Domain (2 routes)**: Complete migration with authentication
    - GET `/api/export/tasks` → `trpc.importExport.exportTasks`
    - POST `/api/import/tasks` → `trpc.importExport.importTasks`
  - **Auth Domain (4 routes)**: Partial migration with public procedures
    - GET `/api/auth/public-signup` → `trpc.auth.getPublicSignupStatus`
    - POST `/api/auth/register` → `trpc.auth.register`
    - POST `/api/auth/reset-password/request` → `trpc.auth.requestPasswordReset`
    - POST `/api/auth/reset-password/reset` → `trpc.auth.resetPassword`
    - Note: `/api/auth/[...nextauth]` and `/api/auth/check-admin` remain as API routes due to NextAuth requirements
  - **Settings Homepage (1 route)**: Complete migration with public access
    - GET `/api/settings/homepage-disabled` → `trpc.systemSettings.getHomepageDisabled`
- **Business Logic Layer**: Created comprehensive API layers for both domains with proper validation
- **Test Components**: Added `ImportExportTest.tsx` for testing the new tRPC endpoints
- **Type Safety**: Enhanced type safety with Zod schemas and proper error handling

### Fixed

- **Build Issues**: Resolved TypeScript compilation errors in Settings API
  - Fixed array-to-JSON transformation conflicts for `defaultReminderTiming`, `workingHoursDays`, `workDays`, `selectedCalendars`
  - Created proper transformation functions for database compatibility
- **Schema Alignment**: Fixed Feeds tRPC schema to include all required CalendarEvent fields
- **Type Safety**: Eliminated type conflicts between Zod schemas and Prisma models
- **Build Stability**: Achieved successful TypeScript compilation for all migrated domains

### Changed

- **Store Architecture Updates for tRPC**: Updated Zustand stores to support tRPC integration
  - Modified project store to include tRPC-compatible actions alongside legacy API methods
  - Added deprecation warnings for legacy store methods to guide migration
  - Updated task store tag operations with deprecation warnings for tRPC migration
  - Maintained backward compatibility while encouraging tRPC adoption
- **Migrated Core Domains to tRPC Pattern**
  - **Tasks Domain**: Migrated all 4 task-related API routes to tRPC
    - Created business logic layer with comprehensive CRUD operations
    - Implemented complex recurrence rule handling and task sync tracking
    - Added tRPC router with proper input validation and error mapping
    - Removed old API routes: `/api/tasks/*`, `/api/tasks/[id]/*`, `/api/tasks/normalize-recurrence`, `/api/tasks/schedule-all`
  - **Events Domain**: Migrated all 2 event-related API routes to tRPC
    - Created business logic layer with event CRUD operations
    - Implemented calendar feed ownership validation
    - Added tRPC router with proper authentication and validation
    - Removed old API routes: `/api/events/*`, `/api/events/[id]/*`
  - **Calendar Feeds Domain**: Migrated all 3 feed-related API routes to tRPC
    - Created business logic layer with feed management operations
    - Implemented batch update functionality with transactions
    - Added tRPC router with comprehensive feed operations
    - Removed old API routes: `/api/feeds/*`, `/api/feeds/[id]/*`
- Removed "Upcoming:" prefix from due dates in task views to reduce confusion with the "upcoming" label used for tasks with future start dates
- Updated future task detection to consider tasks as "upcoming" only if they are scheduled for tomorrow or later
- Added new `isFutureDate` utility function in date-utils
- Improved date formatting in task views to consistently show "Upcoming" label for future tasks
- Fixed task overdue check to not mark today's tasks as overdue
- Modified auto-scheduling to exclude tasks that are in progress, preventing them from being automatically rescheduled
- Updated User model to track lifetime access status
- Added new LifetimeAccessPurchase model for purchase tracking
- Updated success URL in checkout session to include session ID
- Improved UX for payment success confirmation
- Updated lifetime subscription checkout to use Stripe price IDs instead of inline product data
- Added new environment variables:
  - `STRIPE_LIFETIME_EARLY_BIRD_PRICE_ID`: Price ID for early bird lifetime access
  - `STRIPE_LIFETIME_REGULAR_PRICE_ID`: Price ID for regular lifetime access
- Updated verifyPaymentStatus to include additional payment information
- Improved error handling and logging in subscription flow
- Improved SAAS/open source code separation:
  - Renamed subscription-related files to include `.saas.ts` extension:
    - `/src/lib/actions/subscription.ts` → `/src/lib/actions/subscription.saas.ts`
    - `/src/lib/services/subscription.ts` → `/src/lib/services/subscription.saas.ts`
    - `/src/lib/hooks/useSubscription.ts` → `/src/lib/hooks/useSubscription.saas.ts`
    - `/src/app/api/subscription/lifetime/route.ts` → `/src/app/api/subscription/lifetime/route.saas.ts`
    - `/src/app/api/subscription/lifetime/status/route.ts` → `/src/app/api/subscription/lifetime/status/route.saas.ts`
    - `/src/app/api/subscription/lifetime/verify/route.ts` → `/src/app/api/subscription/lifetime/verify/route.saas.ts`
    - `/src/app/(saas)/subscription/lifetime/success/page.tsx` → `/src/app/(saas)/subscription/lifetime/success/page.saas.tsx`
  - Updated all imports referencing these files to use the new paths
  - Created separate implementations of components with SAAS-specific code:
    - Split `LifetimeAccessBanner` into `.saas.tsx` and `.open.tsx` versions
    - Modified Calendar component to use dynamic imports based on `isSaasEnabled` flag
    - Removed direct SAAS imports from common components
- **Migrated 15 API Routes to tRPC**: Successfully migrated multiple domains from Next.js API routes to tRPC procedures

  **Tasks Domain (4 routes)**:

  - `/api/tasks` → `tasks.getAll`, `tasks.create`
  - `/api/tasks/[id]` → `tasks.getById`, `tasks.update`, `tasks.delete`
  - `/api/tasks/normalize-recurrence` → `tasks.normalizeRecurrence`
  - `/api/tasks/schedule-all` → `tasks.scheduleAll`
  - Features: Complex filtering, recurrence rule handling, task sync tracking, auto-scheduling logic
  - Business logic layer: `src/lib/api/tasks/` with comprehensive schemas and CRUD operations
  - tRPC router: `src/server/trpc/routers/tasks/` with full procedures and error mapping

  **Events Domain (2 routes)**:

  - `/api/events` → `events.getAll`, `events.create`
  - `/api/events/[id]` → `events.getById`, `events.update`, `events.delete`
  - Features: Event CRUD operations with calendar feed ownership validation
  - Business logic layer: `src/lib/api/events/` with event management operations
  - tRPC router: `src/server/trpc/routers/events/` with authentication and validation

  **Calendar Feeds Domain (3 routes)**:

  - `/api/feeds` → `feeds.getAll`, `feeds.create`
  - `/api/feeds/[id]` → `feeds.getById`, `feeds.update`, `feeds.delete`
  - `/api/feeds/batch-update` → `feeds.batchUpdate`
  - Features: Feed management with batch operations and transactions
  - Business logic layer: `src/lib/api/feeds/` with comprehensive feed operations
  - tRPC router: `src/server/trpc/routers/feeds/` with full CRUD and batch procedures

  **Settings Domain (6 routes)**:

  - `/api/user-settings` → `settings.get`, `settings.update` (type: 'user')
  - `/api/notification-settings` → `settings.get`, `settings.update` (type: 'notification')
  - `/api/calendar-settings` → `settings.get`, `settings.update` (type: 'calendar')
  - `/api/auto-schedule-settings` → `settings.get`, `settings.update` (type: 'autoSchedule')
  - `/api/data-settings` → `settings.get`, `settings.update` (type: 'data')
  - `/api/integration-settings` → `settings.get`, `settings.update` (type: 'integration')
  - Features: Unified settings system handling all settings types with type-based routing
  - Business logic layer: `src/lib/api/settings/` with comprehensive settings management
  - tRPC router: `src/server/trpc/routers/settings/` with get/update procedures for all settings types

  **Task Sync Domain (5 routes)**:

  - `/api/task-sync/providers` → `taskSync.providers.getAll`, `taskSync.providers.create`
  - `/api/task-sync/providers/[id]` → `taskSync.providers.getById`, `taskSync.providers.update`, `taskSync.providers.delete`
  - `/api/task-sync/providers/[id]/lists` → `taskSync.providers.getLists`
  - `/api/task-sync/mappings` → `taskSync.mappings.getAll`, `taskSync.mappings.create`
  - `/api/task-sync/mappings/[id]` → `taskSync.mappings.getById`, `taskSync.mappings.update`, `taskSync.mappings.delete`
  - `/api/task-sync/sync` → `taskSync.sync.trigger`
  - Features: Task provider and mapping management with sync operations
  - Business logic layer: `src/lib/api/task-sync/` with provider and mapping operations
  - tRPC router: `src/server/trpc/routers/task-sync/` with nested routers for providers, mappings, and sync

- **Enhanced Type Safety**: All migrated routes now have end-to-end type safety from client to database
- **Centralized Error Handling**: Consistent error handling and logging across all tRPC procedures
- **Input Validation**: Comprehensive Zod schemas for all inputs with proper validation
- **Authentication Integration**: Proper user authentication and authorization in all procedures

### Technical Improvements

- **Layered Architecture**: Established clean separation between tRPC layer and business logic layer
- **Reusable Business Logic**: Created domain-specific business logic layers that can be used by both tRPC and traditional API routes
- **Comprehensive Schemas**: Zod schemas for all inputs and outputs with proper TypeScript integration
- **Test Components**: Created test components for each migrated domain to verify functionality
- **Migration Pattern**: Established consistent pattern for migrating remaining routes

### Migration Progress

- ✅ **37 routes migrated** (Tasks: 4, Events: 2, Feeds: 3, Settings: 6, Task Sync: 5, Logs: 5, Import/Export: 2, Auth: 4, Setup: 2, Accounts: 1, Integration Status: 1, System Settings: 2)
- ✅ **tRPC infrastructure** fully operational across all migrated domains
- ✅ **Type-safe API communication** established
- ✅ **Centralized error handling** implemented
- ✅ **Input validation** with comprehensive Zod schemas
- 🔄 **17 routes remaining** (Calendar Integrations: 15, Auth: 2) - Calendar routes remain as API routes due to OAuth/external service requirements

### Known Issues

- **Calendar Integration Routes**: 15 calendar integration routes remain as API routes due to OAuth flows, external service integrations, and webhook requirements
- **Auth Routes**: 2 auth routes (`[...nextauth]`, `check-admin`) remain as API routes due to NextAuth requirements and middleware usage

### Next Steps

- **Migration Complete**: 37 out of 54 total routes successfully migrated to tRPC (68.5% completion)
- **Remaining Routes**: 17 routes intentionally remain as API routes due to technical requirements (OAuth, webhooks, external integrations)
- **Architecture Established**: Layered pattern and migration methodology proven successful
- **Future Work**: Add comprehensive test coverage for all migrated domains and update frontend components to use tRPC hooks

### Removed

- **Legacy API Routes**: Removed 15 Next.js API route files that have been successfully migrated to tRPC
- **Zustand Dependencies**: Reduced reliance on Zustand for API state management in favor of React Query integration

## [1.3.0] 2025-03-25

### Added

- Comprehensive bidirectional task synchronization system with support for Outlook
  - Field mapping system for consistent task property synchronization
  - Recurrence rule conversion for recurring tasks
  - Intelligent conflict resolution based on timestamps
  - Support for task priorities and status synchronization
- Password reset functionality with email support for both SAAS and open source versions
- Smart email service with queued (SAAS) and direct (open source) delivery options
- System setting to optionally disable homepage and redirect to login/calendar
- Daily email updates for upcoming meetings and tasks (configurable)
- Resend API key management through SystemSettings

### Changed

- Enhanced task sync manager for true bidirectional synchronization
- Improved date and timezone handling across calendar and task systems
- Moved sensitive credentials from environment variables to SystemSettings
- Replaced Google Fonts CDN with self-hosted Inter font
- Updated API routes to follow NextJS 15 conventions
- Split task sync route into SAAS and open source versions
  - Moved background job-based sync to `route.saas.ts`
  - Created synchronous version in `route.open.ts` for open source edition

### Fixed

- Multiple task synchronization issues:
  - Prevented duplicate task creation in Outlook
  - Fixed task deletion synchronization
  - Resolved bidirectional sync conflicts
  - Fixed task mapping and direction issues
- All-day events timezone and display issues
- Various TypeScript and linter errors throughout the task sync system

### Removed

- Legacy one-way Outlook task import system and related components
- OutlookTaskListMapping model in favor of new TaskListMapping
- RESEND_API_KEY from environment variables

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

### Technical Debt

- Added proper TypeScript types to replace `any` types
- Added eslint-disable comments only where absolutely necessary
- Fixed linter and TypeScript compiler errors
- Improved code maintainability with better type definitions
- Added documentation for the job processing system
- Standardized error handling across the codebase

### Removed

- Separate one-way sync methods in favor of a more efficient bidirectional approach

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

### Security

- Added Stripe webhook signature verification
- Secure handling of payment processing
- Protected routes with authentication checks

## [0.1.0] - 2024-04-01

### Added

- Initial release

### Technical Improvements

- **Enhanced Type Safety**: Full TypeScript inference across client-server boundary
- **Improved Developer Experience**: Automatic API documentation and IntelliSense
- **Centralized Error Handling**: Consistent error responses with proper HTTP status codes
- **Input Validation**: Comprehensive Zod schema validation for all API inputs
- **Business Logic Separation**: Clean separation between API layer and business logic
- **Test Components**: Created test components for verifying tRPC integration

### Architecture

- **Layered Architecture**: Frontend (React Components) → tRPC Layer (Routers & Procedures) → Backend API/Business Logic Layer → Database & Generated Schemas
- **Migration Pattern Established**: Standardized approach for migrating remaining API routes
- **Backward Compatibility**: Maintained existing functionality while improving architecture

### Progress Summary

- ✅ **9 API routes migrated** (Tasks: 4, Events: 2, Feeds: 3)
- ✅ **46 remaining routes** to be migrated following established pattern
- ✅ **tRPC infrastructure** fully operational and tested
- ✅ **Type-safe API communication** established across all migrated domains

### Next Steps

- Continue domain-by-domain migration following established pattern
- Migrate Settings, Task Sync, Logging, and remaining domains
- Update frontend components to use tRPC hooks instead of direct API calls
- Implement optimistic updates and enhanced caching strategies
