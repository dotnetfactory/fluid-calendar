# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

FluidCalendar is an open-source alternative to Motion: intelligent task scheduling plus calendar management. It ships in two flavors from one codebase - a free self-hosted **open source** build and a hosted **SAAS** build with premium features (billing, advanced AI scheduling).

## Commands

```bash
npm run dev               # Dev server (Next.js + Turbopack) on :3000
npm run build             # Production build (SAAS extensions if NEXT_PUBLIC_ENABLE_SAAS_FEATURES=true)
npm run build:os          # Open-source build (forces SAAS features off)
npm run type-check        # tsc --noEmit
npm run lint              # next lint (CI requires --max-warnings=0; lint-staged enforces this)
npm run format            # prettier --write

npm run test:unit         # Jest unit tests (Node env, src/**/__tests__/**/*.test.ts)
npm run test:e2e          # Playwright e2e (tests/, needs server on TEST_BASE_URL/localhost:3000)
npx jest path/to/file.test.ts          # Run a single Jest test file
npx jest -t "test name substring"      # Run tests matching a name

npm run prisma:generate   # Regenerate Prisma client after schema changes
npm run prisma:studio     # Browse the DB
npm run db:up             # Start the Postgres container (docker compose)

npm run build:worker      # Compile the BullMQ worker (tsconfig.worker.json -> dist/)
npm run start:worker      # Run the compiled background job worker
```

- **Install with `npm install --legacy-peer-deps`** (React 19 peer-dep conflicts otherwise).
- Node version is pinned in `.nvmrc` (22.x).
- Husky pre-commit runs `lint-staged`: eslint (zero warnings) + prettier + `type-check` on staged files.

## Tech Stack

Next.js 15 (App Router) · React 19 · TypeScript · Prisma + PostgreSQL · NextAuth.js (v4) · Zustand · TanStack Query · FullCalendar · Tailwind + shadcn/ui (Radix) · Zod · BullMQ + Redis (jobs) · Stripe (SAAS billing).

## Architecture

**Local-first calendar sync.** External calendars (Google / Outlook / CalDAV) are never read live in the UI. Each provider syncs into our own DB (`CalendarFeed` + `CalendarEvent`), and the app always operates on local data. OAuth token refresh is handled centrally so expired tokens are renewed transparently and syncing continues. Provider logic lives in `src/lib/{google,outlook,caldav}-*.ts` and `src/lib/token-manager.ts`.

**Task scheduling engine** (`src/services/scheduling/`): `TaskSchedulingService` orchestrates auto-scheduling; `TimeSlotManager` enumerates candidate slots from work hours / buffers; `SlotScorer` ranks them; `CalendarServiceImpl` checks calendar availability. Tasks marked `isAutoScheduled` get `scheduledStart/End` and a `scheduleScore`.

**Task sync** (`src/lib/task-sync/`): one-way sync from external task providers (Outlook, Google Tasks) into FluidCalendar using **selective field sync** - external-owned fields (title, status, due date, recurrence) are overwritten on each sync; local-owned fields (start date, duration, priority, energy level) are preserved. See `src/lib/task-sync/README.md`.

**Background jobs** use BullMQ + Redis. All job code lives in `src/saas/jobs/` (SAAS-only) and runs in a separate worker process (`build:worker` / `start:worker`).

**State**: Zustand stores in `src/store/` (small, focused, one concern each - `calendar.ts`, `task.ts`, `settings.ts`, etc.). Server state via TanStack Query. Command palette (cmdk) commands live in `src/lib/commands/`.

## SAAS vs Open Source (critical)

The private SAAS repo is the superset; the public open-source repo is generated from it via `scripts/sync-repos.sh`. Get this wrong and SAAS code leaks into the public repo.

- All SAAS-only code goes in **`src/saas/`**.
- Route groups: `src/app/(saas)/`, `src/app/(open)/`, `src/app/(common)/`.
- File-extension convention: `*.saas.ts(x)` compile only in the SAAS build, `*.open.ts(x)` only in open-source, plain files in both. `next.config.js` derives `pageExtensions` from `NEXT_PUBLIC_ENABLE_SAAS_FEATURES`. **Always give files in `(saas)`/`(open)` an explicit `.saas`/`.open` extension** so the wrong build doesn't compile them.
- For divergent shared components, create `Component.saas.tsx` and `Component.open.tsx` side-by-side and pick via dynamic import keyed on the env var (see `src/app/(common)/settings/page.tsx`).
- Feature-gate with `isSaasEnabled` / `isFeatureEnabled()` from `src/lib/config.ts`.
- Do **not** use `.gitignore` to hide SAAS files - exclusions belong in `sync-repos.sh`.
- When adding a feature, decide whether it's open-source, SAAS-only, or core-with-premium-enhancement. If unsure, ask.

## Conventions

- **Prisma client**: import the singleton `prisma` from `@/lib/prisma`. Never `new PrismaClient()`. Import Prisma *types* from `@prisma/client`.
- **Dates**: use helpers in `@/lib/date-utils.ts` for all date work, including `new Date()` - don't reach for `date-fns`/`date-fns-tz` directly.
- **Calendar DB access**: go through `@/lib/calendar-db.ts`.
- **Logging**: use the `logger` from `@/lib/logger`, never `console.log`. Define a `LOG_SOURCE` string per file and pass it as the last arg: `logger.error("msg", { error }, LOG_SOURCE)`.
- **API route handlers** (Next 15): `params` is a Promise - `async function GET(req, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; }`.
- **Admin-only**: API routes use `requireAdmin` middleware from `@/lib/auth/api-auth` (do not call `getServerSession` and check role by hand); UI uses the `useAdmin` hook or `<AdminOnly>` wrapper with `<AccessDeniedMessage>`.
- **shadcn/ui**: add components with `npx shadcn@latest add`. Icons via `react-icons`.
- **JSX text**: escape quotes/apostrophes as `&apos;` / `&quot;`.
- Keep changes minimal and scoped; don't refactor unrelated code. Don't remove `//todo` comments; add them for deferred work.
- Update `CHANGELOG.md` under `[unreleased]` as you make user-facing changes.

## Layout reference

- `src/services/scheduling/` - task auto-scheduling engine
- `src/lib/` - providers, auth, date utils, config, commands, task-sync, db helpers
- `src/store/` - Zustand stores
- `src/components/` - feature-foldered UI (calendar, tasks, settings, auth, ...)
- `src/app/api/` - route handlers
- `prisma/schema.prisma` - Postgres schema (27 models; auth, calendar, tasks, settings, jobs, waitlist, subscriptions)
- `src/saas/jobs/` - BullMQ background jobs (SAAS, separate worker process)

<!-- mulch:start -->
## Project Expertise (Mulch)
<!-- mulch-onboard-v:1 -->

This project uses [Mulch](https://github.com/jayminwest/mulch) for structured expertise management.

**At the start of every session**, run:
```bash
mulch prime
```

This injects project-specific conventions, patterns, decisions, and other learnings into your context.
Use `mulch prime --files src/foo.ts` to load only records relevant to specific files.

**Before completing your task**, review your work for insights worth preserving — conventions discovered,
patterns applied, failures encountered, or decisions made — and record them:
```bash
mulch record <domain> --type <convention|pattern|failure|decision|reference|guide> --description "..."
```

Link evidence when available: `--evidence-commit <sha>`, `--evidence-bead <id>`

Run `mulch status` to check domain health and entry counts.
Run `mulch --help` for full usage.
Mulch write commands use file locking and atomic writes — multiple agents can safely record to the same domain concurrently.

### Before You Finish

1. Discover what to record:
   ```bash
   mulch learn
   ```
2. Store insights from this work session:
   ```bash
   mulch record <domain> --type <convention|pattern|failure|decision|reference|guide> --description "..."
   ```
3. Validate and commit:
   ```bash
   mulch sync
   ```
<!-- mulch:end -->
