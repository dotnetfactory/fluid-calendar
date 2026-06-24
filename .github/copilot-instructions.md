# GitHub Copilot Instructions for FluidCalendar

These are repository-wide instructions for GitHub Copilot's coding agent. They are a
condensed mirror of `CLAUDE.md` and `openspec/project.md`; when anything here is
ambiguous or conflicts, **`CLAUDE.md` is the source of truth**. Keep this file in sync
with it.

## Overview

FluidCalendar is an open-source alternative to Motion: intelligent task scheduling plus
calendar management. It ships in two flavors from one codebase - a free self-hosted
**open source** build and a hosted **SAAS** build with premium features (billing,
advanced AI scheduling).

**Tech stack:** Next.js 15 (App Router) - React 19 - TypeScript - Prisma + PostgreSQL -
NextAuth.js (v4) - Zustand - TanStack Query - FullCalendar - Tailwind + shadcn/ui
(Radix) - Zod - BullMQ + Redis (background jobs) - Stripe (SAAS billing).

## Setup and commands

- **Install with `npm install --legacy-peer-deps`** (React 19 peer-dep conflicts
  otherwise). Node version is pinned in `.nvmrc` (22.x).

```bash
npm run dev          # Dev server (Next.js + Turbopack) on :3000
npm run build        # Production build
npm run build:os     # Open-source build (forces SAAS features off)
npm run type-check   # tsc --noEmit
npm run lint         # next lint (CI requires zero warnings)
npm run test:unit    # Jest unit tests (Node env, src/**/__tests__/**/*.test.ts)
npm run test:e2e     # Playwright e2e (needs a server on TEST_BASE_URL/localhost:3000)
npm run prisma:generate   # Regenerate Prisma client after schema changes
```

Run a single test with `npx jest path/to/file.test.ts` or `npx jest -t "name"`.

**Verification gate for any contribution (must all pass before review):**

1. `npm run type-check` - clean
2. `npm run lint` - **zero warnings** (CI fails on any warning)
3. `npm run test:unit` - green

Do **not** run `npm run format` (it rewrites the whole repo); rely on your editor's
Prettier integration for changed files. Husky's pre-commit hook runs `npm run lint`
and `npm run type-check`; a `lint-staged` config (eslint zero-warnings + prettier +
type-check on staged files) also exists in `package.json`.

## Architecture

- **Local-first calendar sync.** External calendars (Google / Outlook / CalDAV) are
  never read live in the UI; each provider syncs into our DB (`CalendarFeed` +
  `CalendarEvent`) and the app always operates on local data. Provider logic lives in
  `src/lib/{google,outlook,caldav}-*.ts` and `src/lib/token-manager.ts`.
- **Task scheduling engine** (`src/services/scheduling/`): `TaskSchedulingService`
  orchestrates auto-scheduling; `TimeSlotManager` enumerates candidate slots;
  `SlotScorer` ranks them; `CalendarServiceImpl` checks availability.
- **Task sync** (`src/lib/task-sync/`): one-way sync from external task providers using
  selective field sync (external-owned fields overwritten each sync; local-owned fields
  preserved).
- **Background jobs**: BullMQ + Redis; all job code lives in `src/saas/jobs/`
  (SAAS-only) and runs in a separate worker process.
- **State**: small focused Zustand stores in `src/store/`; server state via TanStack
  Query; command-palette (cmdk) commands in `src/lib/commands/`.

## SAAS vs open source (most important rule)

The private SAAS repo is the superset; the public open-source repo is generated from it
via `scripts/sync-repos.sh`. Getting this wrong leaks SAAS code into the public repo.

- All SAAS-only code goes in **`src/saas/`**.
- Route groups: `src/app/(saas)/`, `src/app/(open)/`, `src/app/(common)/`.
- File-extension convention: `*.saas.ts(x)` compile only in the SAAS build,
  `*.open.ts(x)` only in open-source, plain files in both. **Always** give files in
  `(saas)`/`(open)` an explicit `.saas`/`.open` extension.
- Feature-gate with `isSaasEnabled` / `isFeatureEnabled()` from `src/lib/config.ts`.
- Do **not** use `.gitignore` to hide SAAS files - exclusions belong in
  `sync-repos.sh`.
- When adding a feature, decide whether it is open-source, SAAS-only, or
  core-with-premium-enhancement. If unsure, ask in the PR rather than guessing.

## Code-style conventions

- **Prisma client**: import the singleton `prisma` from `@/lib/prisma`; never
  `new PrismaClient()`. Import Prisma _types_ from `@prisma/client`.
- **Dates**: use the helpers in `@/lib/date-utils` for all date work (including
  `new Date()`); don't reach for `date-fns` / `date-fns-tz` directly.
- **Calendar DB access**: go through `@/lib/calendar-db.ts`.
- **Logging**: use `logger` from `@/lib/logger`, never `console.log`. Define a
  `LOG_SOURCE` string per file and pass it last:
  `logger.error("msg", { error }, LOG_SOURCE)`.
- **API route handlers** (Next 15): `params` is a Promise -
  `const { id } = await params;`.
- **Admin-only**: API routes use `requireAdmin` from `@/lib/auth/api-auth`; UI uses the
  `useAdmin` hook or the `<AdminOnly>` wrapper with `<AccessDeniedMessage>`.
- **shadcn/ui**: add components with `npx shadcn@latest add`; icons via `react-icons`.
- **JSX text**: escape quotes/apostrophes as `&apos;` / `&quot;`.
- **No em dashes** in copy; use hyphens, commas, or rephrase.
- Keep changes minimal and scoped; don't refactor unrelated code. Don't remove `//todo`
  comments; add them for deferred work.
- **Update `CHANGELOG.md`** under `[Unreleased]` for any user-facing change.

## Where things live

- `src/services/scheduling/` - task auto-scheduling engine
- `src/lib/` - providers, auth, date utils, config, commands, task-sync, db helpers
- `src/store/` - Zustand stores
- `src/components/` - feature-foldered UI (calendar, tasks, settings, auth, ...)
- `src/app/api/` - route handlers
- `prisma/schema.prisma` - Postgres schema
- `src/saas/jobs/` - BullMQ background jobs (SAAS, separate worker process)
- `openspec/` - OpenSpec proposals and specs for non-trivial changes
