# Design: Dependency Update Strategy

## Context

FluidCalendar has accumulated technical debt in its dependencies over time. The project currently has:
- 21 security vulnerabilities (1 critical, 10 high)
- Multiple packages several major versions behind
- Framework updates (Next.js 16, TailwindCSS 4, Prisma 7) with significant breaking changes

This update must balance:
- Security requirements (vulnerabilities must be addressed)
- Stability (application must remain functional)
- Development velocity (minimize disruption to ongoing work)

## Goals / Non-Goals

### Goals
- Address all 21 security vulnerabilities
- Update to latest stable versions of all dependencies
- Maintain full application functionality
- Keep both SaaS and open-source builds working
- Minimize manual migration effort where tooling exists

### Non-Goals
- Feature changes or enhancements
- Code refactoring beyond what's required for migration
- Changing the technology stack
- Updating to beta/canary versions

## Key Decisions

### Decision 1: Phased Migration Approach

**Choice**: Update dependencies in 7 phases, grouped by risk and dependency relationships.

**Rationale**:
- Allows easy rollback if issues are discovered
- Isolates breaking changes to specific commits
- Enables parallel work on other features during migration
- Each phase can be tested independently

**Alternatives Considered**:
1. **Big Bang Update**: Update everything at once
   - Pro: Faster execution
   - Con: Hard to debug issues, risky rollback
   - Rejected: Too risky for production application

2. **Package-by-Package**: Update one package at a time
   - Pro: Maximum isolation
   - Con: Many related packages need simultaneous updates
   - Rejected: Too slow, doesn't account for inter-dependencies

### Decision 2: TailwindCSS v4 Migration Strategy

**Choice**: Use the official `@tailwindcss/upgrade` tool, then manually fix remaining issues.

**Rationale**:
- The upgrade tool handles most configuration migration automatically
- CSS-first configuration is cleaner and more maintainable
- The project already uses modern browsers (acceptable browser support)

**Key Changes**:
```css
/* Before (v3) */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* After (v4) */
@import "tailwindcss";
```

**Configuration Migration**:
```css
/* Before: tailwind.config.ts */
export default {
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6'
      }
    }
  }
}

/* After: globals.css */
@theme {
  --color-primary: #3b82f6;
}
```

### Decision 3: Prisma v7 Architecture

**Choice**: Use PostgreSQL driver adapter (`@prisma/adapter-pg`) for production, keep SQLite for development.

**Rationale**:
- Driver adapters are now required in Prisma v7
- Explicit driver configuration provides better control
- Aligns with the project's existing dual-database strategy

**New Files Required**:
```typescript
// prisma.config.ts
import { defineConfig } from 'prisma'
import path from 'path'

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma/schema.prisma'),
})
```

```typescript
// src/lib/db/prisma.ts (updated)
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({ adapter })
```

### Decision 4: Next.js 16 Middleware Migration

**Choice**: Rename `middleware.ts` → `proxy.ts` and update function export.

**Rationale**:
- Next.js 16 enforces the new naming convention
- `proxy.ts` better reflects the network boundary purpose
- The codemod tool handles most of the migration

**Code Change**:
```typescript
// Before: middleware.ts
export function middleware(request: NextRequest) { ... }
export const config = { matcher: [...] }

// After: proxy.ts
export function proxy(request: NextRequest) { ... }
export const config = { matcher: [...] }
```

### Decision 5: Zustand v5 Import Strategy

**Choice**: Use named imports and `createWithEqualityFn` from `zustand/traditional` where equality functions are needed.

**Rationale**:
- Zustand v5 removes default exports
- The `shallow` equality function is commonly used in this project
- `createWithEqualityFn` provides backward compatibility

**Code Pattern**:
```typescript
// Before (v4)
import create from 'zustand'
import { shallow } from 'zustand/shallow'

const useStore = create((set) => ({...}))
const value = useStore(selector, shallow)

// After (v5)
import { createWithEqualityFn } from 'zustand/traditional'
import { shallow } from 'zustand/shallow'

const useStore = createWithEqualityFn((set) => ({...}), shallow)
```

### Decision 6: Zod v4 Migration

**Choice**: Use gradual migration with subpath imports if needed.

**Rationale**:
- Zod v4 supports importing from `zod/v3` and `zod/v4` simultaneously
- Allows incremental migration if full migration proves difficult
- The codemod tool (`zod-v3-to-v4`) can automate most changes

**Key Changes**:
```typescript
// Before (v3)
const schema = z.object({...}).merge(otherSchema)
const errors = zodError.errors

// After (v4)
const schema = z.object({...}).extend(otherSchema.shape)
const issues = zodError.issues
```

## Risks / Trade-offs

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Build failures during migration | High | Medium | Run CI after each phase |
| Runtime errors in production | Medium | High | Full E2E testing before merge |
| Performance regression | Low | Medium | Monitor build times and runtime |
| Browser compatibility issues (TailwindCSS v4) | Low | Low | Target modern browsers only |
| Database migration issues (Prisma v7) | Medium | High | Test both PostgreSQL and SQLite |

## Migration Plan

### Order of Operations

```
Phase 1: Security & Minor    ─┐
Phase 2: TailwindCSS v4       ├── Can be done in parallel
Phase 3: Prisma v7           ─┘
Phase 4: Next.js 16          ── Depends on Phase 1
Phase 5: Zustand + Zod       ── Independent
Phase 6: Stripe SDKs         ── Independent
Phase 7: Remaining           ── After all major frameworks
```

### Rollback Strategy

Each phase should be a separate commit. To rollback:
```bash
# Identify the problematic phase
git log --oneline

# Revert to before that phase
git revert <commit-hash>

# Or reset branch (if not pushed)
git reset --hard <commit-before-phase>
```

### Testing Checkpoints

After each phase:
1. `npm run type-check` - TypeScript compilation
2. `npm run lint` - Code quality
3. `npm run test:unit` - Unit tests
4. `npm run build` - Production build (SaaS)
5. `npm run build:os` - Production build (open-source)

After Phase 8 (Final):
- `npm run test:e2e` - Full E2E test suite
- Manual testing of critical user flows

## Open Questions

1. **Should we pin specific versions or use `^` ranges?**
   - Recommendation: Use `^` for minor/patch, pin majors for stability

2. **Should we update Docker base images as well?**
   - Node.js 20+ is already the minimum for several packages
   - Recommendation: Verify Docker images use Node.js 20+

3. **Should we add `npm audit` to CI pipeline?**
   - Recommendation: Yes, to catch future vulnerabilities early

## References

- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [TailwindCSS v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide)
- [Prisma v7 Migration Guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7)
- [Zustand v5 Migration Guide](https://zustand.docs.pmnd.rs/migrations/migrating-to-v5)
- [Zod v4 Changelog](https://zod.dev/v4/changelog)
- [Stripe Node.js SDK Releases](https://github.com/stripe/stripe-node/releases)
