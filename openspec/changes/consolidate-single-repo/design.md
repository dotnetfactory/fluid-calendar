# Design: Single Repository with Private SaaS Submodule

## Context

FluidCalendar needs an **open-core model**:
- **Core features** (calendar, tasks, integrations): Open source, MIT license
- **SaaS features** (subscriptions, pSEO, admin, waitlist): Proprietary, private

The current dual-repo sync approach is error-prone. The goal is a single public repository where:
- `git clone` → Working open-source app
- `git clone --recurse-submodules` → Full SaaS app with private features

## Goals / Non-Goals

### Goals
- Public repo works standalone as complete open-source app
- SaaS code completely hidden in private submodule
- Single development workflow (work in main repo)
- Clean separation between core and SaaS code
- Preserve all current functionality

### Non-Goals
- Changing the core application architecture
- Creating a monorepo with multiple packages
- Supporting runtime SaaS feature injection (build-time only)

## Decisions

### Decision 1: Git Submodule for SaaS Code
**What**: Use a Git submodule at `saas/` that contains all proprietary code

**Why**:
- Clean separation - SaaS code in separate repo
- Standard Git workflow - submodules are well-understood
- Access control - private repo for submodule
- Single clone for full version with `--recurse-submodules`

**Alternatives considered**:
- Automated sync (current): Still two repos to manage, sync can drift
- Private npm package: More complex setup, needs private registry
- Branch-based: Hard to enforce privacy on GitHub (non-Enterprise)

### Decision 2: Symlink-Based Route Integration
**What**: Use symlinks to make submodule routes appear in Next.js app directory

**Why**: Next.js requires routes in `src/app/`. We can't directly include routes from `saas/app/`.

**Implementation**:
```
# When submodule present, setup script creates:
src/app/(saas) → ../../saas/app/(saas)    # symlink
```

**Risks**:
- Windows compatibility (use junctions or require WSL)
- Git might track symlinks differently
- IDE indexing may need configuration

**Mitigation**:
- Cross-platform setup script using Node.js
- Test on all target platforms
- Document IDE setup

### Decision 3: Split Prisma Schema
**What**: Core models in public `prisma/schema.prisma`, SaaS models in `saas/prisma/schema.saas.prisma`

**Core models** (public):
- User, Account, Session, VerificationToken
- Task, Project, Tag
- CalendarFeed, CalendarEvent, ConnectedAccount
- TaskProvider, TaskChange, TaskListMapping
- Settings models (UserSettings, CalendarSettings, etc.)

**SaaS models** (private):
- Subscription, SubscriptionPlanConfig, SubscriptionHistory, SubscriptionUsage
- Waitlist, PendingWaitlist, BetaSettings
- Article, ArticleCluster, ArticleGenerationLog, AICallLog
- JobRecord
- BookingLink, Booking

**Merge strategy**:
```typescript
// scripts/setup-saas.ts
if (hasSaasSubmodule) {
  // Merge schemas into prisma/schema.prisma
  const coreSchema = readFile('prisma/schema.prisma');
  const saasSchema = readFile('saas/prisma/schema.saas.prisma');
  writeFile('prisma/schema.prisma', mergeSchemas(coreSchema, saasSchema));
}
```

**Alternative considered**: Keep full schema in public
- Rejected: Exposes SaaS data model structure

### Decision 4: Dependency Splitting
**What**: Core dependencies in main package.json, SaaS dependencies in saas/package.json

**SaaS-only dependencies** (move to submodule):
```json
{
  "bullmq": "^5.x",
  "ioredis": "^5.x",
  "stripe": "^18.x",
  "@stripe/react-stripe-js": "^3.x",
  "@stripe/stripe-js": "^7.x",
  "@ai-sdk/azure": "^3.x",
  "ai": "^6.x",
  "resend": "^4.x"
}
```

**Merge strategy**:
```typescript
// scripts/setup-saas.ts
if (hasSaasSubmodule) {
  const mainPkg = readJSON('package.json');
  const saasPkg = readJSON('saas/package.json');
  mainPkg.dependencies = { ...mainPkg.dependencies, ...saasPkg.dependencies };
  writeJSON('package.json', mainPkg);
}
```

### Decision 5: Merge .open. Files into Core
**What**: Remove the `.open.` file extension pattern; those become the default implementations

**Current `.open.` files**:
- `page.open.tsx` → Becomes the landing page (with optional SaaS enhancement)
- `NotificationProvider.open.tsx` → Becomes default (no-op provider)
- `email-service.open.ts` → Becomes default (no-op email)
- `waitlist.open.ts` → Becomes default (empty store)

**Why**:
- Simplifies codebase
- No more build-time extension switching for open vs SaaS
- SaaS features additive via submodule, not replacement

### Decision 6: Build-Time vs Runtime Detection
**What**: Detect submodule at **build time**, not runtime

**Implementation**:
```typescript
// next.config.ts
const fs = require('fs');
const hasSaas = fs.existsSync('./saas/app/(saas)');

const nextConfig = {
  env: {
    NEXT_PUBLIC_HAS_SAAS: hasSaas ? 'true' : 'false',
  },
  // ... conditionally include saas routes
};
```

**Why**:
- Dead code elimination - SaaS code not in open-source bundle
- No runtime checks needed for route existence
- Clear build output for each version

## File Structure

### Public Repository
```
fluid-calendar/
├── src/
│   ├── app/
│   │   ├── (common)/           # Core routes
│   │   │   ├── calendar/
│   │   │   ├── tasks/
│   │   │   └── settings/
│   │   ├── (saas)/             # Symlink → saas/app/(saas) (when present)
│   │   └── api/                # Core APIs only
│   ├── components/             # Core components
│   ├── lib/
│   │   ├── config.ts           # Feature detection
│   │   └── ...                 # Core libraries
│   └── store/                  # Core stores
├── saas/                       # Git submodule (empty placeholder in public)
├── prisma/
│   └── schema.prisma           # Core models
├── scripts/
│   └── setup-saas.ts           # Submodule integration script
├── next.config.ts
├── package.json
└── tsconfig.json
```

### Private Submodule (saas/)
```
saas/
├── app/
│   └── (saas)/
│       ├── admin/
│       ├── billing/
│       ├── pricing/
│       └── subscription/
├── api/                        # SaaS API routes
│   ├── admin/
│   ├── stripe/
│   └── waitlist/
├── components/
│   ├── admin/
│   └── subscription/
├── lib/
│   ├── email/
│   ├── services/
│   └── hooks/
├── store/
│   └── waitlist.ts
├── jobs/                       # BullMQ workers
├── k8s/                        # Kubernetes configs
├── prisma/
│   └── schema.saas.prisma      # SaaS models
├── .github/
│   └── workflows/              # Deployment workflows
├── package.json                # SaaS dependencies
└── README.md
```

## Integration Flow

### Developer Setup (Open Source)
```bash
git clone https://github.com/dotnetfactory/fluid-calendar
cd fluid-calendar
npm install
# No saas/ submodule, setup-saas.ts does nothing
npm run dev  # Works with core features only
```

### Developer Setup (Full SaaS)
```bash
git clone --recurse-submodules https://github.com/dotnetfactory/fluid-calendar
cd fluid-calendar
npm install
# postinstall runs setup-saas.ts:
#   - Creates symlinks
#   - Merges dependencies
#   - Merges Prisma schema
#   - Runs npm install again for SaaS deps
npm run dev  # Full SaaS features available
```

## Risks / Trade-offs

### Risk: Symlink Complexity
**Impact**: Medium
**Mitigation**:
- Use Node.js `fs.symlink` with proper flags for cross-platform
- Fall back to file copying on Windows if junctions fail
- Comprehensive testing on all platforms

### Risk: Prisma Schema Merge Conflicts
**Impact**: Medium
**Mitigation**:
- Clear conventions for model naming
- Automated merge script with conflict detection
- CI checks for schema validity

### Risk: Import Path Confusion
**Impact**: Low
**Mitigation**:
- Clear `@saas/*` path alias
- TypeScript will catch invalid imports
- IDE configuration documented

### Trade-off: Build Complexity
**Accepted**: The setup script adds complexity but is run once. The benefit of clean separation outweighs the one-time setup cost.

### Trade-off: Submodule Learning Curve
**Accepted**: Some developers unfamiliar with submodules. Documentation and setup script minimize friction.

## Migration Plan

### Phase 1: Preparation
- Inventory all SaaS files
- Set up private submodule repo
- Create setup script

### Phase 2: Code Migration
- Move SaaS code to submodule
- Update imports
- Split Prisma schema
- Merge .open. files

### Phase 3: Build System
- Update next.config.ts
- Update tsconfig.json
- Test both build modes

### Phase 4: Documentation & Cleanup
- Update README, create CONTRIBUTING.md
- Remove sync scripts
- Clean up references

### Phase 5: Cutover
- Push changes
- Add submodule reference
- Test deployment
- Archive old repo

## Open Questions

1. **API Route Handling**: SaaS API routes can't use symlinks easily. Options:
   - Keep them in main repo but gate with feature flag (leaks route structure)
   - Use Next.js rewrites to proxy to submodule API
   - **Recommended**: Move to submodule, use dynamic route handler that imports from submodule

2. **Shared Types**: Some types are used by both core and SaaS code.
   - **Recommended**: Keep shared types in public repo, SaaS imports from core

3. **Database Migrations**: How to handle migrations for split schema?
   - **Recommended**: Migrations stay in main repo, setup script merges schema before generation

## Findings from Open-Source Repo Analysis

Analysis of `/Users/emad/src/fluid-calendar` reveals important details:

### Current State
- **File count**: OS has 277 files in src/, SaaS has 457 (65% more)
- **Prisma models**: OS has 27 models, SaaS adds 7 SaaS-specific models
- **Git commits**: OS has 95 commits, SaaS has 166 (71 ahead)
- **CI/CD**: OS only has `docker-publish.yml`, SaaS has full deployment pipelines

### Items Requiring Attention

1. **next.config.ts is empty stub in OS**
   - Current OS config: `const nextConfig: NextConfig = {}; export default nextConfig;`
   - Need to add submodule detection and pageExtensions logic
   - The SaaS version has the full implementation we can use as reference

2. **Prisma migrations are separate**
   - OS: `prisma/migrations/` with OS-only migrations
   - SaaS: `prisma/migrations/` with full migration history
   - **Solution**: Keep migrations in public repo, SaaS schema extends via merge script

3. **src/jobs/ is stub directory in OS**
   - Contains empty folders: `config/`, `processors/`, `queues/`, `templates/`, `utils/`
   - **Solution**: Remove stub directory from OS, jobs live entirely in submodule

4. **Documentation gaps in OS**
   - No CONTRIBUTING.md
   - memory-bank/ directory is empty
   - **Solution**: Create CONTRIBUTING.md, keep memory-bank in submodule

### Validation Checklist
- [x] OS is clean subset of SaaS - no conflicting files
- [x] Feature flag system works correctly
- [x] Prisma schema is backwards compatible
- [x] Environment variables are cleanly separated
- [x] No hardcoded SaaS code leaked to OS
- [ ] next.config.ts needs submodule-aware update
- [ ] Stub directories need cleanup
- [ ] Documentation needs enhancement
