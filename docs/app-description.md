# FluidCalendar: Intelligent Task Scheduling & Calendar Management

## Overview

FluidCalendar is an open-source alternative to Motion, designed for intelligent task scheduling and calendar management. It combines the power of automatic task scheduling with the flexibility of open-source software, helping you stay on top of your tasks with smart scheduling capabilities, multi-provider calendar integration, and customizable workflows.

**Current Status**: Active Development (Beta)
**License**: MIT
**Deployment Options**: Self-hosted (open source) or managed SaaS at [FluidCalendar.com](https://fluidcalendar.com)

## Core Capabilities

### 1. **Intelligent Auto-Scheduling**
FluidCalendar's flagship feature is its sophisticated auto-scheduling engine that automatically places tasks in optimal time slots based on:
- Your calendar availability across multiple providers
- Task priority, duration, and due dates
- Energy level preferences (high/medium/low energy tasks)
- Preferred time of day (morning/afternoon/evening)
- Work hours and buffer time between tasks
- Project grouping for focused work sessions

The scheduling algorithm uses a scoring system to evaluate potential time slots, considering factors like:
- Time until due date
- Task priority
- Energy level matching
- Preferred time alignment
- Buffer time compliance
- Calendar conflicts

### 2. **Multi-Provider Calendar Integration**
Seamlessly sync with multiple calendar providers:

- **Google Calendar**: Full bidirectional sync with incremental updates, webhook support for real-time notifications, and OAuth 2.0 authentication
- **Outlook Calendar**: Complete Microsoft 365/Outlook integration with task sync capabilities
- **CalDAV**: Standards-based calendar sync for self-hosted solutions (Nextcloud, Radicale, etc.)

Features include:
- Incremental sync with delta tokens for performance
- Real-time webhook subscriptions (Google)
- Conflict detection and resolution
- Multi-account support per provider
- Calendar-specific color coding and visibility controls

### 3. **Advanced Task Management**
Comprehensive task management system with:

- **Task Organization**: Projects, tags, status tracking (todo/in_progress/completed), priority levels, descriptions, and due dates
- **Recurring Tasks**: Support for complex recurrence patterns with automatic regeneration on completion
- **Auto-Scheduling Toggle**: Choose which tasks get automatically scheduled vs. manually managed
- **Schedule Locking**: Prevent rescheduling of specific tasks
- **Task Postponement**: Temporarily push tasks to future dates
- **Bulk Operations**: Schedule all pending tasks, batch status updates
- **Multiple Views**: List view with sortable columns, Kanban board view, Focus mode for single-task concentration

### 4. **Bidirectional Task Synchronization**
Keep your tasks in sync across external systems:

- **Provider Support**: Google Tasks, Outlook Tasks/To Do
- **Sync Capabilities**:
  - Bidirectional sync (changes flow both ways)
  - Change tracking and conflict resolution
  - Project/list mapping between systems
  - Automatic recurrence rule conversion
  - Selective sync (choose which lists to sync)
  - Auto-schedule preferences per mapping
- **Background Processing**: Async job processing with retry mechanisms for reliability

### 5. **Focus Mode**
Distraction-free task execution:
- Clean, minimal interface showing only the current task
- Quick actions for task completion and status updates
- Task queue showing upcoming work
- Timer integration for time tracking
- Keyboard shortcuts for rapid navigation

### 6. **Flexible Settings & Customization**

**User Settings**:
- Theme preferences (light/dark/system)
- Time zone configuration
- Week start day customization
- Time format (12h/24h)
- Default calendar view (day/week/month/agenda)

**Calendar Settings**:
- Working hours configuration per day
- Default event duration and color
- Reminder defaults
- Refresh intervals

**Auto-Schedule Settings**:
- Work days and hours definition
- Calendar selection for availability checking
- Buffer time between tasks
- Energy level time mappings
- Project grouping preferences

**Notification Settings**:
- Email notification preferences
- Daily summary emails
- Event invites, updates, and cancellations
- Reminder timing customization

**Integration Settings**:
- Per-provider sync intervals
- Auto-sync toggles
- Calendar-specific configurations

## Technical Architecture

### Technology Stack

**Frontend**:
- **Next.js 15**: React framework with App Router for server-side rendering and API routes
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling with custom design system
- **Framer Motion**: Smooth animations and transitions
- **FullCalendar**: Robust calendar UI with multiple views
- **Zustand**: Lightweight state management
- **TanStack Query (React Query)**: Data fetching, caching, and synchronization
- **Radix UI**: Accessible component primitives
- **Sonner**: Beautiful toast notifications

**Backend**:
- **Next.js API Routes**: RESTful API endpoints
- **Prisma ORM**: Type-safe database access with migrations
- **NextAuth.js**: Authentication with multiple providers
- **PostgreSQL**: Production database (SQLite for development)
- **Redis**: Job queues and caching (SaaS)
- **BullMQ**: Background job processing (SaaS)

**Calendar & Task APIs**:
- **Google APIs Client**: Google Calendar and Tasks integration
- **Microsoft Graph**: Outlook Calendar and To Do integration
- **tsdav**: CalDAV protocol implementation
- **ical.js**: iCalendar format parsing
- **RRule**: Recurrence rule handling

**Payment & Billing** (SaaS):
- **Stripe**: Subscription management and payment processing
- **Webhook handlers**: Real-time subscription updates

**Email** (SaaS):
- **Resend**: Transactional email service for notifications and summaries

### Design Principles

1. **User Data Isolation**: All database models include userId for proper multi-tenancy
2. **Webhook-First Architecture**: Subscription changes handled exclusively via Stripe webhooks for reliability
3. **Incremental Sync**: Delta tokens and sync tokens minimize API calls and improve performance
4. **Async Processing**: Long-running operations (task sync, email sending) handled via job queues
5. **Type Safety**: End-to-end TypeScript with Prisma for database type generation
6. **Structured Logging**: Centralized logging with LOG_SOURCE tracking for debugging
7. **Feature Flags**: Dual-version architecture supporting both open-source and SaaS builds

### Key Architectural Patterns

**Auto-Scheduling Algorithm**:
1. Fetch calendar events from selected calendars
2. Identify available time slots within work hours
3. Score each slot based on task properties and preferences
4. Select optimal slot with highest score
5. Create scheduled event in database
6. Handle conflicts and overlaps

**Calendar Sync Flow**:
1. Initial full sync with provider
2. Store sync/delta token
3. Subsequent incremental syncs using token
4. Webhook subscriptions for real-time updates
5. Periodic token refresh and revalidation

**Task Sync Flow**:
1. Provider connection and authentication
2. List mapping configuration (external list → internal project)
3. Initial full sync with change tracking
4. Bidirectional sync on changes with conflict detection
5. Background job processing with retry logic

**Subscription Management** (SaaS):
- Success pages read-only (display state)
- All database writes in webhook handlers
- Comprehensive event handling (checkout, updates, cancellations, payment status)
- Subscription history audit trail

## Who It's For

### Primary Users
- **Knowledge workers** managing multiple projects and deadlines
- **Freelancers and consultants** juggling client work and personal tasks
- **Students** balancing coursework, assignments, and extracurricular activities
- **Team leads and managers** coordinating team calendars and task distribution

### User Personas

**The Overwhelmed Professional**:
- Struggles with task prioritization and time blocking
- Uses multiple calendar systems (work Outlook, personal Google)
- Wants automation to reduce daily planning overhead
- Values energy-based scheduling for optimal productivity

**The Self-Hosted Enthusiast**:
- Prefers open-source solutions for data control
- Comfortable with Docker and self-hosting
- Uses CalDAV with Nextcloud or similar
- Wants to customize scheduling algorithms

**The Integration Power User**:
- Relies heavily on existing tools (Google Workspace, Microsoft 365)
- Needs seamless bidirectional sync
- Wants centralized view across multiple systems
- Values data consistency and real-time updates

**The Privacy-Conscious User**:
- Concerned about data privacy with commercial solutions
- Wants self-hosted alternative to Motion
- Needs full control over data storage and access
- Willing to manage infrastructure for privacy benefits

## Key Features in Detail

### Smart Time Slot Management

FluidCalendar's `TimeSlotManager` and `SlotScorer` services work together to:

1. **Discover Available Slots**: Parse calendar events and identify free time within defined work hours
2. **Apply Buffer Times**: Ensure minimum spacing between tasks to avoid context switching fatigue
3. **Score Candidates**: Evaluate each potential slot based on multiple weighted factors:
   - **Due Date Proximity** (40% weight): Urgency increases as deadline approaches
   - **Priority Match** (25% weight): High-priority tasks get prime time slots
   - **Energy Level Alignment** (20% weight): Match task energy requirements to user's energy patterns
   - **Preferred Time** (15% weight): Schedule tasks during user's preferred time of day
4. **Select Optimal Slot**: Choose the highest-scoring slot that meets all constraints
5. **Create Calendar Event**: Generate scheduled event with task metadata

### Calendar Feed Management

Each calendar connection is represented as a `CalendarFeed` with:
- Provider-specific authentication tokens
- Sync state (last sync time, sync tokens, error status)
- Webhook subscriptions (for Google Calendar)
- Color coding and visibility settings
- Event collection with full CRUD operations

Users can:
- Connect multiple accounts per provider
- Enable/disable specific calendars for scheduling
- Choose which calendars are visible in the UI
- Force manual sync or rely on automatic intervals
- View sync status and troubleshoot errors

### Project-Based Organization

Projects provide a way to group related tasks:
- Visual organization with custom colors
- Filter tasks by project in list and board views
- Bulk scheduling by project (focus mode)
- Integration with external task systems (map external lists to projects)
- Project-level archival for completed initiatives

### Recurrence Rule Engine

FluidCalendar supports complex recurring tasks using RRule standard:
- **Patterns**: Daily, weekly, monthly, yearly, and custom frequencies
- **Completion Handling**: Automatically generate next instance when completed
- **Calendar Integration**: Recurring calendar events with master/instance relationships
- **Sync Compatibility**: Convert recurrence rules between systems (Google, Outlook, iCal)

### System Administration

Administrators can:
- Configure global settings (Google/Outlook API credentials)
- Manage user accounts (create, disable, role assignment)
- Control public signup availability
- Configure homepage behavior
- Monitor background jobs (SaaS)
- View subscription analytics (SaaS)
- Manage waitlist and invitations (SaaS)

## Technology Integrations

### Authentication Providers
- **Google OAuth**: Sign in with Google account, automatic calendar access
- **Microsoft OAuth**: Sign in with Microsoft account, Outlook integration
- **Credentials**: Email/password authentication with secure bcrypt hashing

### Calendar Providers
- **Google Calendar API v3**: Events, colors, webhooks, incremental sync
- **Microsoft Graph API**: Outlook Calendar, event management, delta queries
- **CalDAV (RFC 4791)**: Standards-based calendar access for self-hosted solutions

### Task Providers
- **Google Tasks API**: Task lists, tasks, due dates, completion status
- **Microsoft Graph Tasks/To Do**: Lists, tasks, recurrence, completion tracking

### Infrastructure Services (SaaS)
- **Stripe**: Payment processing, subscription management, webhook events
- **Resend**: Email delivery for notifications, daily summaries, waitlist management
- **Redis**: Job queue persistence, caching layer
- **Sentry**: Error tracking and monitoring (planned)

### Development & Deployment
- **Docker**: Containerized deployment with PostgreSQL database
- **Docker Compose**: Local development environment setup
- **Infisical**: Secret management for production deployments
- **Kubernetes**: Production deployment with Loki/Promtail/Grafana logging stack

## Future Possibilities

### Near-Term Roadmap
- **AI-Powered Scheduling**: Machine learning to improve slot selection based on historical data
- **Team Collaboration**: Shared calendars, task assignment, team scheduling
- **Mobile Apps**: Native iOS and Android applications
- **Additional Integrations**: Apple Calendar, Zoom, Slack, Notion
- **Advanced Analytics**: Productivity insights, time tracking reports, goal tracking
- **Template System**: Pre-configured project templates and recurring task sets

### Long-Term Vision
- **Natural Language Processing**: Create tasks and events via text or voice
- **Habit Tracking**: Recurring goals with streaks and accountability
- **Calendar Sharing**: Public calendars and booking pages
- **API Platform**: Public API for third-party integrations
- **Plugin System**: Community-developed extensions and integrations
- **Multi-Language Support**: Internationalization for global users

### Community & Contributions
- Open-source development model
- Community-driven feature prioritization
- Transparent roadmap and issue tracking
- Contribution guidelines for developers
- Documentation for self-hosting and customization

## Dual-Version Architecture

FluidCalendar maintains both open-source and SaaS versions from a single codebase using feature flags and conditional compilation:

### Open Source Version
- Full calendar and task management
- Multi-provider sync
- Auto-scheduling engine
- Self-hosted deployment
- Community support

### SaaS Version (Additional Features)
- Managed infrastructure
- Automatic updates
- Stripe subscription billing
- Background job processing (daily emails, automated sync)
- Waitlist management with referral system
- Premium support channels
- Advanced admin dashboard

### Sync Strategy
- Private SaaS repository (fluid-calendar-saas)
- Public open-source repository (fluid-calendar)
- Automated sync scripts filter out SaaS-specific code
- Shared core features benefit both versions
- Community contributions can flow upstream

## Development Status & Roadmap

**Current Status**: Active Beta Development

FluidCalendar is under active development with many features functional but subject to bugs and breaking changes. Users should expect:
- Frequent updates and improvements
- Occasional bugs and edge cases
- Breaking changes as architecture evolves
- Responsive bug fixes and community support

**Stability Goals**:
- Comprehensive test coverage (unit and E2E)
- Production-ready deployment documentation
- Migration guides for database schema changes
- Stable API contracts for integrations
- Performance optimization and scaling

**Contributing**:
We welcome contributions! Areas needing help:
- Bug reports and testing
- Documentation improvements
- UI/UX enhancements
- Integration development
- Translation and localization
- Performance optimization

See the [GitHub repository](https://github.com/dotnetfactory/fluid-calendar) for contribution guidelines and issue tracking.

---

**Built by**: [EliteCoders](https://www.elitecoders.co)
**Support**: hello@elitecoders.co
**License**: MIT
**Website**: [fluidcalendar.com](https://fluidcalendar.com)
