# Project Context

## Purpose
FluidCalendar is an open-source alternative to Motion for intelligent task scheduling and calendar management. The SaaS version includes both open-source features and premium subscription functionality with a dual-version architecture.

**Core Goals:**
- Intelligent auto-scheduling of tasks based on calendar availability
- Multi-provider calendar integration (Google, Outlook, CalDAV)
- Bidirectional task synchronization with external systems
- Energy-level aware scheduling with time preferences
- Premium features via subscription model

## Tech Stack

### Frontend
- **Next.js 15** with App Router and Turbopack
- **React 19** with Server Components
- **TypeScript 5.8** for type safety
- **TailwindCSS 3.4** with tailwindcss-animate
- **Zustand 4.5** for client-side state management
- **React Query (TanStack Query)** for server state
- **Radix UI** primitives for accessible components
- **FullCalendar** for calendar visualization
- **Framer Motion** for animations
- **React Hook Form + Zod** for form handling and validation

### Backend
- **Next.js API Routes** (App Router)
- **Prisma ORM 6.3** with PostgreSQL (production) / SQLite (development)
- **NextAuth.js 4.24** for authentication (Google, Outlook, credentials)
- **BullMQ** with Redis for background job processing
- **Stripe** for subscription management

### Infrastructure
- **Docker** for local development (PostgreSQL, Redis)
- **Kubernetes** for production deployment
- **Infisical** for secrets management
- **Loki + Promtail + Grafana** for logging
- **Sentry** for error tracking

### External Integrations
- **Google Calendar API** via googleapis
- **Microsoft Graph API** for Outlook
- **CalDAV** via tsdav
- **Resend** for transactional emails

## Project Conventions

### Code Style
- **ESLint** with maximum 0 warnings policy (enforced in pre-commit hooks)
- **Prettier** with Tailwind CSS plugin and import sorting
- **TypeScript strict mode** - compilation must be clean
- **Structured logging** - always use `@/lib/logger` with LOG_SOURCE parameter
- **No string concatenation in logs** - use structured metadata objects

```typescript
// Correct logging pattern
const LOG_SOURCE = "ComponentName";
logger.info("Action completed", { userId, action }, LOG_SOURCE);
```

### Architecture Patterns

#### Dual-Version System
- Feature flag: `NEXT_PUBLIC_ENABLE_SAAS_FEATURES`
- File extensions: `.saas.tsx` for SaaS-only, `.open.tsx` for open-source only
- Route groups: `(common)/`, `(open)/`, `(saas)/`

#### Webhook-First for Subscriptions
All subscription database changes MUST happen in Stripe webhooks, never in success pages. Success pages are read-only.

#### Multi-tenancy
- All database models include `userId` for isolation
- All queries scoped to user at the API level
- No cross-tenant data leakage

#### Component Organization
```
components/
├── auth/          # Authentication components
├── calendar/      # Calendar UI components
├── tasks/         # Task management UI
├── settings/      # Settings forms and displays
├── subscription/  # Billing and subscription (SaaS)
├── ui/            # Reusable UI components (shadcn/ui style)
└── providers/     # Context providers
```

### Testing Strategy
- **Jest** for unit tests (`npm run test:unit`)
- **Playwright** for E2E tests (`npm run test:e2e`)
- **Type checking** required before commit (`npm run type-check`)
- **Lint-staged** runs ESLint and Prettier on staged files

### Git Workflow
- **Main branch**: `main`
- **Pre-commit hooks**: ESLint (0 warnings), Prettier, TypeScript compilation
- **Commit message**: Should describe the "why" not just the "what"
- **No force pushes** to main/master without explicit request

## Domain Context

### Task Scheduling
- **Auto-scheduling algorithm**: Places tasks in optimal time slots based on calendar availability
- **Energy levels**: Tasks can have energy requirements (high/medium/low) matched to user preferences
- **Buffer time**: Configurable gaps between scheduled items
- **Conflict resolution**: Handles overlapping events and task conflicts

### Calendar Sync
- **Incremental sync**: Uses delta tokens for efficient updates
- **Webhook subscriptions**: Real-time updates from providers
- **Bidirectional sync**: Changes flow both ways between FluidCalendar and external calendars
- **Recurrence rules**: Full RRULE support via rrule library

### Subscription Model (SaaS)
- **Plans**: Free tier + paid subscription tiers
- **Stripe integration**: Checkout, customer portal, webhooks
- **Trial support**: Time-limited trial periods
- **Webhook events**: checkout.session.completed, subscription.updated/deleted, invoice events

## Important Constraints

### Technical Constraints
- Must support both PostgreSQL (production) and SQLite (development)
- Background jobs require Redis (SaaS features only)
- Calendar APIs have rate limits - use incremental sync
- Webhook endpoints must verify signatures

### Security Requirements
- Never expose API keys in client code
- Input validation on all API endpoints
- Rate limiting on public APIs
- Webhook signature verification required
- User data isolation enforced at query level

### Code Quality Requirements
- Zero ESLint warnings policy
- Clean TypeScript compilation required
- Comprehensive cleanup when removing features
- No backwards-compatibility hacks for unused code

## External Dependencies

### Calendar Providers
| Provider | Library | Auth |
|----------|---------|------|
| Google Calendar | googleapis | OAuth 2.0 |
| Microsoft Outlook | @microsoft/microsoft-graph-client | MSAL |
| CalDAV | tsdav | Basic/OAuth |

### Payment Processing
- **Stripe**: Subscriptions, checkout, customer portal
- Webhook endpoint: `/api/stripe/webhook`
- Customer portal for self-service management

### Email Service
- **Resend**: Transactional emails (SaaS)
- Daily summaries, task reminders, notifications

### Background Processing
- **BullMQ**: Job queues
- **Redis**: Queue storage
- Jobs: email sending, task sync, calendar sync
