# Multi-User Implementation Checklist

This document outlines the step-by-step process for transitioning FluidCalendar from a single-user application to a multi-user system with proper authentication and authorization. The implementation is organized in phases, with each phase building on the previous one.

## Phase 1: Authentication Enhancement and First-Time Setup

### 1.1 Update Database Schema
- [x] move all settings to the database
- [x] Add `role` field to User model in `prisma/schema.prisma`
- [x] Add migration for existing data to associate with admin user

### 1.2 Create First-Time Setup Flow
- [x] Create `src/app/setup` page for initial admin user creation
- [x] Create `src/app/api/setup/route.ts` API endpoint for setup process
- [x] Implement middleware to redirect to setup if no users exist in `src/middleware.ts`
- [x] Create setup form component in `src/components/setup/SetupForm.tsx`
- [x] Implement data migration utility in `src/lib/setup-migration.ts` to associate existing data with admin user

### 1.3 Enhance NextAuth Configuration
- [x] Update `src/app/api/auth/[...nextauth]/route.ts` to add more providers
- [x] Add Email/Password provider with proper validation
- [x] Configure callbacks for user creation and role assignment
- [x] Update session handling to include user role
- [x] Create `src/lib/auth/credentials-provider.ts` for email/password authentication logic

### 1.4 Create Authentication Pages
- [x] Create `src/app/auth/signin/page.tsx` for sign-in
- [x] Create `src/components/auth/SignInForm.tsx` for authentication forms
- [x] Create `src/app/api/auth/register/route.ts` for user registration
- [ ] Create `src/app/auth/forgot-password/page.tsx` for password reset request
- [ ] Create `src/app/auth/reset-password/page.tsx` for password reset
- [ ] Create `src/app/auth/verify-email/page.tsx` for email verification

### 1.5 Implement Authentication Middleware
- [x] Update `src/middleware.ts` for route protection
- [x] Implement role-based access control
- [x] Add public routes configuration
- [x] Add redirect logic for unauthenticated users

## Phase 2: User Management and Access Control

### 2.1 Create User Management API
- [ ] Create `src/app/api/users/route.ts` for user listing and creation
- [ ] Create `src/app/api/users/[id]/route.ts` for user operations
- [ ] Create `src/app/api/invitations/route.ts` for user invitations
- [ ] Create `src/lib/email/templates/invitation.ts` for invitation emails

### 2.2 Implement User Profile Management
- [ ] Create `src/app/profile/page.tsx` for user profile
- [ ] Create `src/app/profile/security/page.tsx` for security settings
- [ ] Create profile form components in `src/components/profile/`
- [ ] Implement avatar upload functionality

### 2.3 Create Admin Dashboard
- [ ] Create `src/app/admin/page.tsx` for admin dashboard
- [ ] Create `src/app/admin/users/page.tsx` for user management
- [ ] Create `src/app/admin/settings/page.tsx` for system settings
- [ ] Create admin components in `src/components/admin/`

### 2.4 Update Data Access Control
- [x] Create `src/lib/auth/current-user.ts` for retrieving current user ID
- [ ] Create `src/lib/auth/permissions.ts` for permission definitions
- [ ] Create `src/lib/auth/access-control.ts` for access control helpers
- [ ] Update database service layer to include user context

## Phase 3: Data Isolation and API Updates

### 3.1 Update Calendar API Routes
- [x] Update `src/app/api/calendar/route.ts` to include user filtering
- [x] Update `src/app/api/calendar/init/route.ts` to associate with current user
- [x] Update `src/app/api/calendar/google/events/route.ts` for user filtering
- [x] Update `src/app/api/calendar/outlook/events/route.ts` for user filtering
- [x] Update `src/app/api/calendar/caldav/events/route.ts` for user filtering

### 3.1.5 Update Settings API Routes
- [x] Create `src/app/api/user-settings/route.ts` for user settings
- [x] Create `src/app/api/calendar-settings/route.ts` for calendar settings
- [x] Create `src/app/api/notification-settings/route.ts` for notification settings
- [x] Create `src/app/api/integration-settings/route.ts` for integration settings
- [x] Create `src/app/api/data-settings/route.ts` for data settings
- [x] Create `src/app/api/auto-schedule-settings/route.ts` for auto-schedule settings
- [x] Create `src/app/api/system-settings/route.ts` for system settings
- [x] Update settings store to use API endpoints

### 3.2 Update Tasks API Routes
- [x] Update `src/app/api/tasks/route.ts` to include user filtering
- [x] Update `src/app/api/tasks/[id]/route.ts` for user-specific operations
- [x] Update `src/app/api/tasks/schedule-all/route.ts` for user filtering
- [x] Update `src/app/api/tasks/normalize-recurrence/route.ts` for user filtering

### 3.3 Update Projects API Routes
- [x] Update `src/app/api/projects/route.ts` to include user filtering
- [x] Update `src/app/api/projects/[id]/route.ts` for user-specific operations

### 3.4 Update Tags API Routes
- [x] Update `src/app/api/tags/route.ts` to include user filtering
- [x] Update `src/app/api/tags/[id]/route.ts` for user-specific operations

### 3.5 Update Feeds API Routes
- [x] Update `src/app/api/feeds/route.ts` to include user filtering
- [x] Update `src/app/api/feeds/[id]/route.ts` for user-specific operations
- [x] Update `src/app/api/events/route.ts` for user filtering
- [x] Update `src/app/api/events/[id]/route.ts` for user-specific operations

### 3.6 Update Accounts API Routes
- [x] Update `src/app/api/accounts/route.ts` to include user filtering
- [ ] Update `src/app/api/accounts/[id]/route.ts` for user-specific operations

### 3.7 Update System Settings API
- [x] Update `src/app/api/system-settings/route.ts` to use proper logging
- [x] Update `src/app/api/system-settings/route.ts` to require admin role

## Phase 4: UI Updates for Multi-User Support

### 4.1 Update Navigation Components
- [x] Update `src/app/settings/page.tsx` to include user management link for admins
- [x] Update `src/app/settings/page.tsx` to integrate user management as a tab instead of a separate page
- [x] Update `src/components/navigation/AppNav.tsx` to include user menu
- [x] Create `src/components/navigation/UserMenu.tsx` for user dropdown with logout functionality
- [x] Update `src/app/layout.tsx` to handle authentication state
- [ ] Create `src/components/auth/AuthStatus.tsx` for auth status display
- [x] Add logout functionality to the user menu

### 4.2 Update Settings Pages
- [x] Create `src/components/settings/UserManagement.tsx` for user management tab
- [x] Create `src/components/settings/PublicSignupSettings.tsx` for controlling public signup
- [x] Update `src/app/settings/page.tsx` to include user-specific settings
- [ ] Create `src/app/settings/account/page.tsx` for account settings
- [ ] Update settings components in `src/components/settings/`

### 4.3 Create Sharing UI
- [ ] Create `src/components/sharing/ShareModal.tsx` for sharing functionality
- [ ] Create `src/components/sharing/PermissionSelector.tsx` for permission selection
- [ ] Update calendar and task views to show sharing status

### 4.4 Update Calendar Views
- [ ] Update `src/app/page.tsx` (calendar page) to filter by user
- [ ] Update calendar components to handle shared calendars
- [ ] Add user indicators for shared items

### 4.5 Update Tasks Views
- [ ] Update `src/app/tasks/page.tsx` to filter by user
- [ ] Update task components to handle shared tasks
- [ ] Add user indicators for shared items

## Phase 5: Sharing and Collaboration Features

### 5.1 Update Database Schema for Sharing
- [ ] Create `CalendarShare` model in `prisma/schema.prisma`
- [ ] Create `ProjectShare` model in `prisma/schema.prisma`
- [ ] Create `TaskShare` model in `prisma/schema.prisma`
- [ ] Add migration for sharing tables

### 5.2 Implement Sharing API
- [ ] Create `src/app/api/calendar/[id]/share/route.ts` for calendar sharing
- [ ] Create `src/app/api/projects/[id]/share/route.ts` for project sharing
- [ ] Create `src/app/api/tasks/[id]/share/route.ts` for task sharing
- [ ] Create `src/lib/sharing/permissions.ts` for sharing permission logic

### 5.3 Implement Notification System
- [ ] Create `Notification` model in `prisma/schema.prisma`
- [ ] Create `src/app/api/notifications/route.ts` for notification management
- [ ] Create `src/components/notifications/NotificationCenter.tsx` for UI
- [ ] Implement real-time notifications with WebSockets or SSE

### 5.4 Create Team/Organization Features
- [ ] Create `Organization` model in `prisma/schema.prisma`
- [ ] Create `Team` model in `prisma/schema.prisma`
- [ ] Create organization and team management API routes
- [ ] Create organization and team management UI components

## Phase 6: SaaS Features (Optional)

### 6.1 Implement Subscription Management
- [ ] Create `Subscription` model in `prisma/schema.prisma`
- [ ] Integrate with payment provider (Stripe, etc.)
- [ ] Create subscription management API routes
- [ ] Create subscription management UI

### 6.2 Implement Usage Limits and Quotas
- [ ] Create usage tracking system
- [ ] Implement quota enforcement
- [ ] Create upgrade prompts and notifications

### 6.3 Add Analytics and Reporting
- [ ] Create analytics data collection
- [ ] Create reporting API routes
- [ ] Create analytics dashboard UI

## Progress Summary and Next Steps

### Completed Tasks
- ✅ Moved all settings to the database
- ✅ Created API endpoints for all settings types
- ✅ Updated settings store to use API endpoints
- ✅ Created utility for retrieving current user ID
- ✅ Added role field to User model for user authorization
- ✅ Created first-time setup flow for initial admin user creation
- ✅ Implemented data migration utility to associate existing data with admin user
- ✅ Fixed middleware to work with Edge Runtime (avoiding direct Prisma usage)
- ✅ Added userId fields to ConnectedAccount, Project, Task, and Tag models
- ✅ Created migration to update database schema for multi-user support
- ✅ Updated setup migration function to associate existing data with admin user
- ✅ Enhanced NextAuth configuration with email/password authentication
- ✅ Created sign-in page and authentication forms
- ✅ Implemented user registration API with public signup control
- ✅ Updated middleware for route protection and role-based access control
- ✅ Created admin-only components and utilities
- ✅ Added public signup setting to control user registration
- ✅ Created user management component integrated into the settings page
- ✅ Fixed client-side errors by properly separating server and client code
- ✅ Improved NextAuth implementation for App Router compatibility
- ✅ Added user menu with logout functionality to the navigation bar
- ✅ Implemented proper session management with NextAuth
- ✅ Fixed registration API to correctly use the timeZone field name from the Prisma schema
- ✅ Fixed password storage in the registration API to use the id_token field
- ✅ Implemented data isolation for tasks API routes
- ✅ Implemented data isolation for projects API routes
- ✅ Implemented data isolation for tags API routes
- ✅ Implemented data isolation for calendar feeds API routes
- ✅ Implemented data isolation for connected accounts API routes
- ✅ Implemented data isolation for available calendars API routes (Google, Outlook, CalDAV)
- ✅ Refactored TokenManager to remove account listing and removal methods in favor of API routes
- ✅ Fixed linter errors in API routes by properly typing request parameters for NextAuth
- ✅ Implemented data isolation for events API routes
- ✅ Implemented data isolation for task scheduling and recurrence normalization
- ✅ Updated calendar-db.ts to include userId in feed objects for proper access control
- ✅ Fixed all linting errors in API routes by properly typing request parameters and removing 'as any' casts
- ✅ Improved type safety throughout the codebase by using NextRequest instead of Request
- ✅ Implemented data isolation for calendar API routes with minimal changes to preserve existing logic
- ✅ Added user filtering to calendar/caldav/route.ts
- ✅ Added user filtering to calendar/google/[id]/route.ts
- ✅ Added user filtering to calendar/google/route.ts
- ✅ Added user filtering to calendar/caldav/sync/route.ts
- ✅ Added user filtering to calendar/outlook/sync/route.ts
- ✅ Added user filtering to calendar/caldav/auth/route.ts
- ✅ Added user filtering to calendar/caldav/test/route.ts
- ✅ Added user filtering to feeds/[id]/sync/route.ts
- ✅ Added admin-only protection to logs/settings/route.ts
- ✅ Added user association to calendar/outlook/route.ts for OAuth callback
- ✅ Replaced getCurrentUserId placeholder with proper authentication in auto-schedule-settings route
- ✅ Replaced getCurrentUserId placeholder with proper authentication in calendar-settings route
- ✅ Replaced getCurrentUserId placeholder with proper authentication in data-settings route
- ✅ Replaced getCurrentUserId placeholder with proper authentication in integration-settings route
- ✅ Replaced getCurrentUserId placeholder with proper authentication in notification-settings route
- ✅ Replaced getCurrentUserId placeholder with proper authentication in user-settings route

### Next Steps
1. **Complete Data Isolation for Remaining API Routes**: This is our highest priority to ensure proper multi-user security.
   - Verify all API routes have proper authentication and user filtering
   - Test all routes to ensure they work correctly with user filtering

### Implementation Priority
With all linting errors fixed, we should focus on completing the data isolation for calendar-related API routes. This is critical for security in a multi-user environment. Once data isolation is complete, we can move on to enhancing the authentication system with password reset and email verification features.

## Data Migration Strategy
We've successfully implemented the data migration strategy for existing data:

1. ✅ Added userId fields to relevant models (ConnectedAccount, Project, Task, Tag)
2. ✅ Created migration to update the database schema
3. ✅ Updated the migration utility to associate existing data with the admin user
4. ✅ Made logs an admin-only feature without modifying the Log model

The migration now properly associates all existing data with the admin user during the setup process, ensuring a smooth transition to multi-user functionality.

## Security Considerations
As we move forward with implementing multi-user functionality, we should keep these security considerations in mind:

1. Implement proper CSRF protection
2. Use secure cookies for session management
3. Implement rate limiting for authentication endpoints
4. Validate all user input
5. Implement proper error handling to avoid information leakage
6. Use HTTPS for all communications
7. Implement proper password hashing and storage
8. Regularly audit authentication and authorization code
9. Ensure system-wide settings (like logs) are only accessible to administrators 