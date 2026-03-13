# Change: Consolidate to Single Repo with Private SaaS Submodule

## Why

The current dual-repository architecture creates maintenance overhead with manual sync scripts. However, simply merging repos would expose proprietary SaaS features (pSEO, subscriptions, admin dashboard, etc.).

**Goal:** Single public repository with a private Git submodule for SaaS features.

- **Public repo** (`fluid-calendar`): Open-source core - calendar, tasks, integrations
- **Private submodule** (`fluid-calendar-saas`): Proprietary features - subscriptions, pSEO, waitlist, admin, background jobs

## What Changes

### 1. Repository Structure Reorganization

**New structure:**
```
fluid-calendar/                      # Public repo (open source)
├── src/
│   ├── app/
│   │   ├── (common)/                # Core routes (calendar, tasks, settings)
│   │   └── api/                     # Core API routes
│   ├── components/                  # Core components
│   ├── lib/                         # Core libraries
│   └── store/                       # Core state management
├── saas/                            # Git submodule → private repo
│   └── (contents below)
├── prisma/
│   ├── schema.prisma                # Core models only
│   └── schema.saas.prisma           # SaaS models (merged when submodule present)
├── scripts/
│   └── setup-saas.ts                # Links submodule into app structure
├── next.config.ts                   # Detects submodule, configures build
└── package.json
```

**Private submodule structure (`saas/`):**
```
saas/                                # Private repo
├── app/
│   └── (saas)/                      # SaaS routes (admin, billing, pSEO)
├── api/                             # SaaS API routes
├── components/                      # SaaS components
├── lib/                             # SaaS services (subscription, email)
├── store/                           # SaaS state (waitlist)
├── jobs/                            # BullMQ background workers
├── k8s/                             # Kubernetes deployment configs
├── prisma/
│   └── schema.saas.prisma           # SaaS-specific Prisma models
└── package.json                     # SaaS-specific dependencies
```

### 2. Code Migration

**Move to submodule (private):**
- `src/app/(saas)/` → `saas/app/(saas)/`
- All `*.saas.tsx` and `*.saas.ts` files → corresponding `saas/` locations
- `src/saas/` (jobs, k8s) → `saas/jobs/`, `saas/k8s/`
- SaaS-specific API routes → `saas/api/`
- SaaS Prisma models (Subscription, Waitlist, Article, etc.) → `saas/prisma/`

**Keep in public repo:**
- `src/app/(common)/` - Core calendar, tasks, settings
- `src/app/(open)/` → Merge into `(common)/` with conditional rendering
- Core components, libraries, stores
- Core Prisma models (User, Task, CalendarEvent, etc.)

### 3. Build System Updates

**`next.config.ts`:**
- Detect if `saas/` submodule is present
- Conditionally include SaaS routes and components
- Set up path aliases (`@saas/*` → `saas/*`)

**`scripts/setup-saas.ts`:**
- Run after `git clone --recurse-submodules`
- Create symlinks from `src/app/(saas)` → `saas/app/(saas)`
- Merge SaaS dependencies into main package.json
- Merge Prisma schemas

**`package.json`:**
- Add `postinstall` script to run setup if submodule present
- Keep SaaS dependencies as optional

### 4. Sensitive Data Handling

- **Parameterize** deployment configs (K8s, workflows) - values come from GitHub Secrets
- **Remove** `.env` files with real credentials
- **Create** comprehensive `.env.example` for core features
- SaaS-specific env vars documented in submodule

### 5. Remove Dual-Repo Sync Tooling

- Delete `scripts/sync-repos.sh`, `sync-repos-reverse.sh`, `sync-issues.sh`
- Remove `npm run sync` scripts
- Delete `.github/workflows/sync-os-issues.yml`

### 6. Documentation

**Public repo:**
- `README.md` - Open source focus, mention SaaS option
- `CONTRIBUTING.md` - How to contribute to core
- `CODE_OF_CONDUCT.md`, `SECURITY.md`

**Private submodule:**
- `saas/README.md` - SaaS setup, deployment
- `saas/docs/` - Internal documentation

## Impact

- **Affected code**: Major restructuring of file locations
- **Build process**: New setup script, updated next.config.ts
- **CI/CD**: Separate workflows for public (test core) and private (full deploy)
- **Prisma**: Split schema approach

## Risk Mitigation

1. **Symlink complexity**: Test thoroughly on all platforms (macOS, Linux, Windows WSL)
2. **Import path changes**: Use codemod script to update all imports
3. **Prisma schema split**: May need custom merge script; alternative is keeping full schema in public with unused models
4. **Deployment continuity**: Test full deployment before cutting over

## Success Criteria

1. `git clone fluid-calendar` → Working open-source app
2. `git clone --recurse-submodules fluid-calendar` → Full SaaS app
3. Core contributors can develop without submodule access
4. SaaS features completely hidden from public repo
5. Both versions build and deploy successfully
