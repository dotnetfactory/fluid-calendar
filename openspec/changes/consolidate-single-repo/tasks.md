# Tasks: Consolidate to Single Repo with Private SaaS Submodule

## Phase 1: Preparation & Analysis

- [ ] 1.1 Create inventory of all SaaS-specific files:
  - All `*.saas.tsx` and `*.saas.ts` files (~64 files)
  - All files in `src/app/(saas)/` (~40 files)
  - All files in `src/saas/` (~29 files)
  - SaaS-specific API routes
- [ ] 1.2 Create inventory of all `.open.` files to merge into core (8 files identified)
- [ ] 1.3 Identify shared dependencies vs SaaS-only dependencies in package.json
  - SaaS-only: bullmq, ioredis, stripe, @stripe/*, @ai-sdk/azure, ai, resend
- [ ] 1.4 Identify Prisma models: core vs SaaS-specific
  - Core: 27 models (User, Task, Project, Calendar*, Settings, etc.)
  - SaaS: 7 additional (Subscription*, Article*, AICallLog, Booking*, JobRecord)
- [ ] 1.5 Map all import paths that will need updating
- [ ] 1.6 **NEW**: Audit OS repo (`/Users/emad/src/fluid-calendar`) for items to address:
  - Empty `src/jobs/` stub directories (remove)
  - Empty `next.config.ts` (needs submodule detection)
  - Missing CONTRIBUTING.md
  - Empty memory-bank/ directory

## Phase 1.5: Clean Up Open-Source Repository

Based on analysis of `/Users/emad/src/fluid-calendar`:

- [ ] 1.5.1 Remove empty stub `src/jobs/` directory (has empty subfolders only)
- [ ] 1.5.2 Update `next.config.ts` to detect submodule and configure build:
  ```typescript
  const fs = require('fs');
  const hasSaas = fs.existsSync('./saas/app/(saas)');
  // Add pageExtensions logic
  ```
- [ ] 1.5.3 Remove empty `memory-bank/` directory (will live in submodule)
- [ ] 1.5.4 Verify `docker-publish.yml` workflow uses correct registry
- [ ] 1.5.5 Clean up any remaining references to sync scripts
- [ ] 1.5.6 Ensure `.gitignore` includes `saas/` directory for submodule

## Phase 2: Create Private SaaS Repository

- [ ] 2.1 Create new private GitHub repo `fluid-calendar-saas` (or rename current)
- [ ] 2.2 Set up repository structure:
  ```
  saas/
  ├── app/(saas)/
  ├── api/
  ├── components/
  ├── lib/
  ├── store/
  ├── jobs/
  ├── k8s/
  ├── prisma/
  └── package.json
  ```
- [ ] 2.3 Initialize with README explaining the submodule purpose

## Phase 3: Code Migration - Move SaaS Code to Submodule

### 3.1 Routes & Pages
- [ ] 3.1.1 Move `src/app/(saas)/` → `saas/app/(saas)/`
- [ ] 3.1.2 Update all imports in moved files to use `@saas/` alias

### 3.2 API Routes
- [ ] 3.2.1 Move all `*.saas.ts` API routes → `saas/api/`
- [ ] 3.2.2 Create route mapping configuration for Next.js

### 3.3 Components
- [ ] 3.3.1 Move SaaS-specific components:
  - `src/components/ui/sponsorship-banner.saas.tsx`
  - `src/components/calendar/LifetimeAccessBanner.saas.tsx`
  - `src/components/providers/NotificationProvider.saas.tsx`
  - Admin components, subscription components
- [ ] 3.3.2 Update imports in moved components

### 3.4 Libraries & Services
- [ ] 3.4.1 Move SaaS services:
  - `src/lib/email/email-service.saas.ts`
  - `src/lib/email/waitlist.saas.ts`
  - `src/lib/services/subscription.saas.ts`
  - `src/lib/actions/subscription.saas.ts`
  - `src/lib/hooks/useSubscription.saas.ts`
- [ ] 3.4.2 Move to `saas/lib/`

### 3.5 State Management
- [ ] 3.5.1 Move `src/store/waitlist.saas.ts` → `saas/store/`

### 3.6 Background Jobs
- [ ] 3.6.1 Move `src/saas/jobs/` → `saas/jobs/`
- [ ] 3.6.2 Move `src/saas/k8s/` → `saas/k8s/`

### 3.7 Prisma Schema
- [ ] 3.7.1 Split schema.prisma into core and SaaS models
- [ ] 3.7.2 Create `prisma/schema.prisma` with core models only
- [ ] 3.7.3 Create `saas/prisma/schema.saas.prisma` with SaaS models
- [ ] 3.7.4 Create schema merge script for full deployment

## Phase 4: Merge .open. Files into Core

- [ ] 4.1 Merge `src/app/(open)/page.open.tsx` into main landing page with conditional
- [ ] 4.2 Merge `src/components/providers/NotificationProvider.open.tsx` - make it the default
- [ ] 4.3 Merge `src/lib/email/email-service.open.ts` - make it the default (no-op)
- [ ] 4.4 Merge `src/store/waitlist.open.ts` - make it the default (empty)
- [ ] 4.5 Remove all `.open.` files after merging
- [ ] 4.6 Update `next.config.ts` to remove `.open.` extension handling

## Phase 5: Build System Setup

### 5.1 Setup Script
- [ ] 5.1.1 Create `scripts/setup-saas.ts`:
  - Detect if saas/ submodule is populated
  - Create symlinks for app routes
  - Merge package.json dependencies
  - Merge Prisma schemas
- [ ] 5.1.2 Add cross-platform support (Windows, macOS, Linux)

### 5.2 Next.js Configuration
- [ ] 5.2.1 Update `next.config.ts`:
  - Detect submodule presence
  - Configure path aliases for `@saas/*`
  - Include SaaS routes when available
- [ ] 5.2.2 Remove `.saas.` extension from pageExtensions (no longer needed)

### 5.3 TypeScript Configuration
- [ ] 5.3.1 Update `tsconfig.json`:
  - Add `@saas/*` path alias
  - Conditionally include saas/ in compilation

### 5.4 Package.json
- [ ] 5.4.1 Add `postinstall` script to run setup-saas
- [ ] 5.4.2 Remove sync scripts
- [ ] 5.4.3 Split dependencies - move SaaS-only deps to saas/package.json:
  - `bullmq`, `ioredis` (background jobs)
  - `stripe`, `@stripe/*` (payments)
  - AI-related packages
- [ ] 5.4.4 Update build scripts for dual-mode

## Phase 6: Sensitive Data & Deployment Configs

### 6.1 Environment Files
- [ ] 6.1.1 Remove `.env` and `.env.test` from repo
- [ ] 6.1.2 Create comprehensive `.env.example` for core
- [ ] 6.1.3 Create `saas/.env.example` for SaaS-specific vars
- [ ] 6.1.4 Update `.gitignore`

### 6.2 Parameterize Deployment (in submodule)
- [ ] 6.2.1 Parameterize `saas/k8s/*.yaml` with placeholders
- [ ] 6.2.2 Parameterize GitHub workflows with secrets references
- [ ] 6.2.3 Parameterize Dockerfiles

### 6.3 Move Deployment Configs to Submodule
- [ ] 6.3.1 Move `.github/workflows/deploy.saas.yml` → `saas/.github/workflows/`
- [ ] 6.3.2 Move `.github/workflows/deploy.staging.saas.yml` → `saas/.github/workflows/`
- [ ] 6.3.3 Create public CI workflow for core testing

## Phase 7: Cleanup Public Repo

- [ ] 7.1 Delete sync scripts:
  - `scripts/sync-repos.sh`
  - `scripts/sync-repos-reverse.sh`
  - `scripts/sync-issues.sh`
- [ ] 7.2 Delete `.github/workflows/sync-os-issues.yml`
- [ ] 7.3 Remove sync-related npm scripts from package.json
- [ ] 7.4 Move `.github/prompts/` to submodule (marketing content)
- [ ] 7.5 Clean up any remaining SaaS references in public code

## Phase 8: Documentation

### 8.1 Public Repo Documentation
- [ ] 8.1.1 Update `README.md`:
  - Focus on open-source installation
  - Brief mention of SaaS option
  - Remove dual-repo sections
- [ ] 8.1.2 Create `CONTRIBUTING.md`
- [ ] 8.1.3 Create `CODE_OF_CONDUCT.md`
- [ ] 8.1.4 Create `SECURITY.md`
- [ ] 8.1.5 Create `.github/ISSUE_TEMPLATE/bug_report.md`
- [ ] 8.1.6 Create `.github/ISSUE_TEMPLATE/feature_request.md`
- [ ] 8.1.7 Create `.github/PULL_REQUEST_TEMPLATE.md`

### 8.2 Private Submodule Documentation
- [ ] 8.2.1 Create `saas/README.md` - Setup and deployment guide
- [ ] 8.2.2 Create `saas/docs/deployment.md` - Full deployment instructions
- [ ] 8.2.3 Create `saas/docs/github-secrets.md` - Required secrets list
- [ ] 8.2.4 Move `memory-bank/` to submodule

### 8.3 Update Existing Docs
- [ ] 8.3.1 Update `CLAUDE.md` - Remove dual-repo references
- [ ] 8.3.2 Update `openspec/project.md` if needed

## Phase 9: CI/CD Setup

### 9.1 Public Repo Workflows
- [ ] 9.1.1 Create `.github/workflows/ci.yml`:
  - Lint, type-check, test core
  - Build open-source version
- [ ] 9.1.2 Create `.github/workflows/release.yml` (optional)

### 9.2 Private Submodule Workflows
- [ ] 9.2.1 Set up workflow to trigger from main repo
- [ ] 9.2.2 Configure deployment workflows with secrets

## Phase 10: Testing & Verification

### 10.1 Open Source Build
- [ ] 10.1.1 Fresh clone without submodule
- [ ] 10.1.2 Run `npm install`
- [ ] 10.1.3 Run `npm run build` - verify success
- [ ] 10.1.4 Run `npm run dev` - verify app works
- [ ] 10.1.5 Verify no SaaS features visible/accessible

### 10.2 Full SaaS Build
- [ ] 10.2.1 Fresh clone with `--recurse-submodules`
- [ ] 10.2.2 Run `npm install` (triggers setup-saas)
- [ ] 10.2.3 Run `npm run build` - verify success
- [ ] 10.2.4 Verify all SaaS features work
- [ ] 10.2.5 Test deployment to staging

### 10.3 Security Verification
- [ ] 10.3.1 Run `gitleaks` or `git-secrets` on public repo
- [ ] 10.3.2 Manual audit of all files for leaked credentials
- [ ] 10.3.3 Verify no SaaS code in public repo

## Phase 11: Cutover

- [ ] 11.1 Back up current repositories
- [ ] 11.2 Push public repo changes
- [ ] 11.3 Push private submodule
- [ ] 11.4 Add submodule reference to public repo
- [ ] 11.5 Test production deployment
- [ ] 11.6 Archive old open-source repo (redirect to new)
- [ ] 11.7 Update any external links
