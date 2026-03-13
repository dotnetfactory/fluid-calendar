# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Approach & Workflow

### Plan-First Development Philosophy
This project follows a **plan-first approach** adapted from Cursor rules:

1. **Analysis Phase**: Always analyze the existing codebase and understand the current state before making changes
2. **Planning Phase**: Present a clear implementation plan and get approval before proceeding
3. **Implementation Phase**: Execute the approved plan systematically
4. **Documentation Phase**: Update relevant documentation after significant changes

### Memory Bank Integration
This project maintains comprehensive documentation following a memory bank pattern:
- **CLAUDE.md**: Primary guidance for Claude Code (this file)
- **Project Documentation**: Found in `/docs/` directory and `/saas/memory-bank/` (submodule)
- **Active Context**: Current development state and ongoing work
- **System Patterns**: Established architectural patterns and conventions

**Key Principle**: Always read existing documentation and understand project context before implementing new features.

### Implementation Workflow

#### For New Features
1. **Analyze**: Read existing code patterns and documentation in `/memory-bank/` and `/docs/`
2. **Plan**: Present implementation approach and get approval
3. **Implement**: Follow established patterns and conventions
4. **Test**: Ensure TypeScript compilation and linting passes
5. **Document**: Update relevant documentation

#### For Bug Fixes  
1. **Investigate**: Understand root cause and related systems
2. **Plan**: Propose fix approach, considering side effects
3. **Fix**: Implement solution following established patterns
4. **Verify**: Test fix and run type checking/linting
5. **Document**: Update documentation if architectural changes made

#### For Refactoring
1. **Assessment**: Understand current implementation and dependencies
2. **Strategy**: Plan migration approach (complete removal vs. gradual)
3. **Implementation**: Execute systematically with comprehensive cleanup
4. **Validation**: Ensure no breaking changes and clean compilation
5. **Cleanup**: Remove all related unused code, imports, and types

## Project Overview

FluidCalendar is an open-source alternative to Motion for intelligent task scheduling and calendar management. This is the **SaaS version** that includes both open-source features and premium subscription functionality.

## Development Commands

### Setup & Environment
```bash
# Copy environment file and configure
cp .env.example .env

# Start development server with Turbopack
npm run dev

# Start PostgreSQL database (Docker)
npm run db:up

# Start Redis for SaaS features (Docker)
npm run redis:up

# Generate Prisma client
npm run prisma:generate

# Open Prisma Studio
npm run prisma:studio
```

### Building & Testing
```bash
# Build for production (SAAS version)
npm run build

# Build open-source version
npm run build:os

# Type checking
npm run type-check

# Linting
npm run lint

# Code formatting
npm run format
npm run format:check

# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e
```

### Background Jobs (SaaS)
```bash
# Build worker
npm run build:worker

# Start worker (development)
npm run start:worker

# Start worker (production)
npm run start:worker:prod
```

## Open-Core Repo Structure

This project uses an open-core model with two GitHub repos:

| Repo | URL | Visibility | Contains |
|------|-----|------------|----------|
| **Public** (`fluid-calendar`) | `github.com/dotnetfactory/fluid-calendar` | Public | Core OS code + `saas/` as submodule |
| **Private** (`fluid-calendar-saas`) | `github.com/dotnetfactory/fluid-calendar-saas` | Private | SaaS-only code (`saas/` folder contents) |

The **public repo is the development repo**. It contains all core open-source code and includes
the private repo as a git submodule at `saas/`. Developers with access to the private repo get
the full SaaS experience; without access, the public repo works standalone using OS stubs.

### Cloning for development

```bash
# Full clone with SaaS (requires access to private repo)
git clone --recurse-submodules https://github.com/dotnetfactory/fluid-calendar.git

# OS-only clone (no private access needed)
git clone https://github.com/dotnetfactory/fluid-calendar.git
```

### Daily development workflow

All development happens in the public repo. Changes can touch both `src/` (public) and `saas/` (private).

**Both repos changed:**
```bash
# 1. Commit and push SaaS changes first (inside the submodule)
cd saas
git add -A
git commit -m "your saas change message"
git push origin HEAD:main
cd ..

# 2. Commit public changes + updated submodule reference
git add src/          # or whatever public files changed
git add saas          # stages the new submodule commit reference
git commit -m "your public change message"
git push origin main
```

**Only public code changed:**
```bash
git add <files>
git commit -m "your message"
git push origin main
```

**Only SaaS code changed:**
```bash
cd saas
git add -A
git commit -m "your message"
git push origin HEAD:main
cd ..
git add saas
git commit -m "chore: update saas submodule"
git push origin main
```

**Important:** Always commit and push inside `saas/` first. The parent repo tracks
the submodule by commit hash — if you commit the parent before pushing `saas/`,
other developers won't be able to resolve the submodule reference.

### Syncing the private repo from the main dev repo

The private repo's `main` branch contains only the `saas/` folder contents.
To update it after changes on the dev branch:

```bash
git subtree split --prefix=saas -b saas-only
git push origin saas-only:main --force
```

### Key rules:
- The **public repo is the primary development repo** — all work happens here
- `saas/` is a git submodule pointing to the private repo
- Core code (`src/`) lives directly in the public repo
- SaaS code (`saas/`) is committed inside the submodule → pushed to private repo
- The public repo works without the submodule — OS stubs provide safe defaults
- See `saas/docs/submodule-setup.md` for full setup details

## Architecture Overview

### Open-Core Architecture
The project uses an open-core model with a Git submodule for SaaS features:

- **Public Repository**: Core calendar/task functionality (open-source, MIT license)
- **Private Submodule** (`saas/`): Proprietary SaaS features (subscriptions, pSEO, admin)
- **Feature Detection**: `next.config.ts` auto-detects if `saas/` submodule is present
- **Build Modes**:
  - `npm run build` - Full build (includes SaaS if submodule present)
  - `npm run build:os` - Open-source only build
- **Setup Script**: `scripts/setup-saas.ts` integrates the submodule (symlinks, schema merge)
- **Clean Script**: `scripts/clean-saas-symlinks.ts` removes symlinks and restores OS stubs (used by `build:os`)

### Open-Core Development Rules — CRITICAL

**Every feature, bug fix, or change MUST be evaluated against these rules.** Before writing any code, determine: does this touch SaaS-only functionality, or core open-source functionality?

#### What is SaaS-only (goes in `saas/`):
- Stripe / payments / subscriptions / billing
- Booking system (BookingLink, Booking, availability)
- pSEO / article generation / learn pages
- Waitlist / beta program
- Admin dashboard (admin routes, job management)
- Background jobs (BullMQ workers)
- AI services (article generation, AI calls)
- Email sending via Resend (the actual send — not the stub interface)
- Subscription enforcement (plan limits, trial logic)
- Any Prisma models: Subscription, BookingLink, Booking, Article, JobRecord, Waitlist, etc.

#### What is core open-source (goes in `src/`):
- Calendar (Google, Outlook, CalDAV integration)
- Task management and auto-scheduling
- User authentication and settings
- Core UI components
- OS stubs that return safe defaults

#### Rules for adding NEW features:

1. **New SaaS feature**: All code goes in `saas/`. Add symlink entries to `scripts/setup-saas.ts` and `scripts/clean-saas-symlinks.ts`. If core code needs to import it, create an OS stub in `src/` that returns a safe default.

2. **New core feature**: Code goes in `src/`. Must work without the `saas/` submodule. Verify with `npm run build:os`.

3. **New Prisma model (SaaS)**: Add to `saas/prisma/schema.prisma`. Do NOT add to `prisma/schema.prisma` — the setup script merges them automatically. If adding relations to User, the `updateUserModel()` function in `setup-saas.ts` handles it.

4. **New Prisma model (core)**: Add to `prisma/schema.prisma`. Create a migration with `npx prisma migrate dev`.

5. **New dependency (SaaS-only)**: Add to `saas/package.json`. Do NOT add to root `package.json` — the setup script merges them automatically.

6. **New dependency (core)**: Add to root `package.json` normally.

#### Rules for OS stubs:

When core code imports a module that only exists in SaaS mode, create an OS stub in `src/` that:
- Exports the same interface/types
- Returns safe defaults (e.g., `hasActiveSubscription: false`, `canAdd: true`)
- Is a no-op for side-effect functions (e.g., email sending logs instead)
- Gets overridden by `setup-saas.ts` via file symlink when SaaS submodule is present
- Gets restored by `clean-saas-symlinks.ts` from `.os-backup` when building OS

#### Checklist for SaaS code changes:

- [ ] Code placed in `saas/`, not `src/`
- [ ] Symlink entries added to `scripts/setup-saas.ts` (expanded dir or file override)
- [ ] Mirror entries added to `scripts/clean-saas-symlinks.ts` (EXPANDED_DIRS or FILE_OVERRIDES)
- [ ] Path added to `.gitignore` (only for pure SaaS paths without OS stubs)
- [ ] OS stub created in `src/` if core code imports the module
- [ ] `npm run build:os` passes (no SaaS imports leak into OS build)
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes with 0 warnings

#### How symlinks work (Turbopack-compatible):

- **Expanded directories**: `mirrorDirWithFileSymlinks()` creates real directories with symlinked files inside (Turbopack doesn't follow directory symlinks for route discovery)
- **File overrides**: `createFileSymlink()` backs up the OS stub to `.os-backup`, then creates a symlink to the SaaS version
- **Cleanup**: `clean-saas-symlinks.ts` removes all symlinks and restores `.os-backup` files

### Core Application Structure

#### Route Organization
- `src/app/(common)/` - Core routes (calendar, tasks, settings)
- `src/app/(open)/` - Open-source landing page and variants
- `saas/app/(saas)/` - SaaS-only routes (billing, admin, waitlist, pricing) - via submodule
- Route-level middleware handles authentication and admin access control

#### Database & ORM
- **Prisma ORM** with PostgreSQL (production) / SQLite (development)
- Multi-user schema with user isolation across all models
- Subscription management with Stripe integration
- Advanced task synchronization with external providers (Google, Outlook)
- you MUST create a migration whenever you make database schema changes

#### Authentication & Authorization
- **NextAuth.js** with multiple providers (Google, Outlook, credentials)
- Role-based access control (user/admin)
- Session-based authentication with JWT tokens
- Middleware-based route protection in `src/middleware.ts`

### Key Architectural Patterns

#### Subscription System (SaaS) - **CRITICAL PATTERN**
**Webhook-First Architecture**: All subscription-related database changes MUST be handled by Stripe webhooks, never in success pages.

##### Success Page Pattern (Read-Only Only)
```typescript
// ✅ CORRECT: Read-only success page
export default async function SuccessPage() {
  // 1. Verify payment with Stripe (read-only)
  const result = await verifyPaymentStatus(sessionId);
  
  // 2. Read current subscription state from DB
  const user = await prisma.user.findUnique({ 
    where: { email: userEmail },
    include: { subscription: true }
  });
  
  // 3. Show loading if webhook hasn't processed yet
  if (paymentComplete && !subscriptionUpdated) {
    return <LoadingDisplay />;
  }
  
  // 4. Display success confirmation
  return <SuccessClient />;
}

// ❌ WRONG: Never do DB writes in success pages
await prisma.subscription.upsert({ ... }); // DON'T DO THIS
```

##### Webhook Handler Pattern (Single Source of Truth)
```typescript
// ✅ CORRECT: All DB changes in webhooks
export async function handleCheckoutSessionCompleted(session) {
  // 1. Handle user creation for new customers
  if (!userId && userEmail) {
    user = await prisma.user.create({ ... });
  }
  
  // 2. Create/update subscription
  await prisma.subscription.upsert({ ... });
  
  // 3. Create audit trail
  await prisma.subscriptionHistory.create({ ... });
}
```

**Benefits**: Reliability (guaranteed delivery), consistency (single source of truth), completeness (handles all subscription lifecycle events), industry standard approach.

**Webhook Events Handled**: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.trial_will_end`

#### Task Scheduling Engine
- **Auto-scheduling Algorithm**: Intelligent task placement based on calendar availability
- Energy level mappings and time preferences
- Buffer time management and conflict resolution
- Scoring system for optimal time slot selection

#### Calendar Integration
- **Multi-Provider Support**: Google Calendar, Outlook, CalDAV
- Incremental sync with delta tokens
- Webhook subscriptions for real-time updates
- Event conflict detection and resolution

#### Task Synchronization
- **Bidirectional Sync**: Tasks sync between FluidCalendar and external systems
- Change tracking with conflict resolution
- Provider-specific field mapping and recurrence rule conversion
- Async job processing with retry mechanisms

### State Management
- **Zustand** for client-side state
- Store factories for consistent state patterns
- Separation of concerns across domain-specific stores (tasks, calendar, settings)

### Background Jobs (SaaS)
- **BullMQ** with Redis for job queues
- Daily summary emails and task reminders
- Automated task synchronization
- Job tracking and retry mechanisms

## Project Structure

```
src/
├── app/
│   ├── (common)/        # Core routes — calendar, tasks, settings
│   ├── (saas)/          # SaaS routes — billing, admin (symlinked from saas/)
│   ├── (open)/          # Open-source landing page
│   ├── (marketing)/     # Marketing pages
│   └── api/             # API routes
├── components/
│   ├── auth/            # Authentication
│   ├── calendar/        # Calendar UI
│   ├── tasks/           # Task management UI
│   ├── settings/        # Settings forms
│   ├── subscription/    # Billing & subscription
│   ├── ui/              # Reusable UI primitives
│   └── providers/       # Context providers
├── lib/                 # Utilities, integrations, business logic
├── store/               # Zustand stores
├── services/            # Service layer
├── hooks/               # Custom React hooks
├── types/               # Shared TypeScript types
└── middleware.ts        # Auth & route protection

saas/                    # Private submodule (symlinked into src/)
├── app/                 # SaaS route pages
├── api/                 # SaaS API routes
├── components/          # SaaS-only components
├── lib/                 # SaaS utilities (stripe, email, etc.)
├── store/               # SaaS-specific stores
├── jobs/                # BullMQ background workers
├── prisma/              # Schema extensions
└── k8s/                 # Kubernetes manifests
```

## Coding Rules

### 1. Modular File Organization
Avoid monolithic files. Each file should have **one responsibility**. When a feature grows, break it into a module folder:

```
feature/
├── index.ts             # Public API — re-exports what consumers need
├── feature-logic.ts     # Core logic
├── feature-types.ts     # Types
└── feature-utils.ts     # Helpers
```

Only `index.ts` is the public interface. Internal files are implementation details.

### 2. File Size Limit
Aim for **100–150 lines per file max**. If a file grows beyond that, refactor it into a module folder per the pattern above.

### 3. One Component Per File
Each React component gets its own file. Co-locate related styles, utils, and types alongside it.

### 4. Import Conventions
- Always use `@/` path aliases (e.g., `@/lib/logger`, `@/components/ui/button`)
- Never import directly from `saas/` — use the symlinked paths under `src/`

### 5. Naming Conventions for Open-Core
- **Core/public components** use plain names (e.g., `LandingPage`, `Settings`, `Nav`) — no "OS" or "Open" prefix
- **SaaS-only components** must include "Saas" in the name (e.g., `SaasLandingPage`, `SaasSettings`) to clearly distinguish them from core components

### 6. Quality Gates
- **0 ESLint warnings** — enforced by pre-commit hooks
- **TypeScript must compile clean** after changes
- Prettier formatting enforced on commit
- When removing features, clean up all related code: APIs, stores, components, types, imports

## Development Patterns

### Component Organization
```
components/
   auth/          # Authentication components
   calendar/      # Calendar UI components  
   tasks/         # Task management UI
   settings/      # Settings forms and displays
   subscription/  # Billing and subscription components
   ui/           # Reusable UI components
   providers/    # Context providers
```

### API Routes Structure
- RESTful endpoints following Next.js App Router conventions
- Consistent error handling and response formatting
- Authentication middleware applied per route
- OpenAPI-style documentation for external integrations

### Database Patterns
- User isolation enforced at the query level
- Soft deletes for audit trails
- Optimistic updates with rollback strategies
- Connection pooling and query optimization

### Testing Strategy
- Unit tests with Jest for utility functions
- Playwright for E2E testing of critical user flows
- Component testing with React Testing Library
- API testing with supertest

## Environment Configuration

### Required Environment Variables
```bash
DATABASE_URL="postgresql://user:pass@host:port/db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-min-32-chars"
NEXT_PUBLIC_ENABLE_SAAS_FEATURES="false"  # Set to "true" for SAAS features
```

### SaaS-Only Variables
```bash
RESEND_API_KEY="your-resend-key"
STRIPE_SECRET_KEY="your-stripe-secret"
STRIPE_WEBHOOK_SECRET="your-webhook-secret"
REDIS_URL="redis://localhost:6379"
```

### Calendar Integration
Configure through UI (Settings > System) or environment variables:
- Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`  
- Outlook: `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`

## Important Development Notes

### Pre-commit Hooks
- ESLint with maximum 0 warnings policy
- Prettier formatting enforcement
- TypeScript compilation checks
- Staged file linting with lint-staged

### Logging & Monitoring

#### Structured Logging Requirements
- **Always import from `@/lib/logger`** and use structured logging
- **Always specify LOG_SOURCE** as third parameter: `logger.info("message", { data }, LOG_SOURCE)`
- **Use structured metadata objects** for context, not string concatenation
- **Log errors with error.message** in metadata, not the full error object

```typescript
// ✅ CORRECT: Structured logging
const LOG_SOURCE = "UserAPI";
logger.info(
  "User created successfully",
  { userId: user.id, email: user.email },
  LOG_SOURCE
);

logger.error(
  "Failed to create user",
  { 
    error: error instanceof Error ? error.message : "Unknown error",
    email: userData.email 
  },
  LOG_SOURCE
);

// ❌ WRONG: String concatenation or missing LOG_SOURCE
logger.info(`User ${user.id} created`); // No structure
logger.error("Error:", error); // Full error object
```

#### Infrastructure & Deployment
- **Kubernetes-first approach** for production logging (Loki + Promtail + Grafana)
- **Container-first design**: stdout/stderr output for proper log collection
- **Global cluster deployment** for multi-application reusability
- **Kubernetes context awareness** for proper labeling
- Sentry integration for error tracking

### Performance Considerations
- Database query optimization with proper indexing
- Calendar sync performance with incremental updates
- Task scheduling algorithm efficiency
- Background job processing optimization

### Security Best Practices
- Never expose API keys or secrets in client code
- Input validation and sanitization on all endpoints  
- Rate limiting on public APIs
- Secure webhook signature verification

### Multi-tenancy & Data Isolation
- **All database models include userId** for proper isolation
- **API endpoints enforce user context** via middleware
- **No cross-tenant data leakage** - all queries scoped to user
- **Admin functions properly scoped** with `requireAdmin` middleware

### Code Quality & Migration Standards

#### TypeScript & Code Quality
- **ESLint with maximum 0 warnings** policy in pre-commit hooks
- **TypeScript compilation must be clean** after any major refactoring
- **Comprehensive cleanup** of related components (APIs, stores, components) when removing features
- **Structured error handling** with proper type safety

#### Migration & Refactoring Approach
- **Complete removal preferred** over gradual migration for legacy systems
- **Maintain backward compatibility** at interface level during transitions  
- **Database schema cleanup should be comprehensive** - remove all related fields/models
- **Interface-level compatibility** maintained during major changes
- **Systematic cleanup** of imports, types, and unused code

## Common Debugging

### Database Issues
- Check connection string format in DATABASE_URL
- Verify Prisma migrations are up to date: `npx prisma migrate dev`
- Reset database if needed: `npx prisma migrate reset`

### Calendar Sync Problems
- Verify API credentials in system settings
- Check token expiration and refresh logic
- Review webhook subscriptions and endpoints
- Monitor incremental sync tokens

### Background Jobs (SaaS)
- Ensure Redis is running for job queues
- Check job status in admin dashboard
- Review worker logs for failed jobs
- Monitor queue health and processing times