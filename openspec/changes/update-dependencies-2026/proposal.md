# Change: Update All Dependencies to Latest Versions (January 2026)

## Why

The project has significant outdated dependencies with 21 security vulnerabilities (1 critical, 10 high severity) and many packages that are multiple major versions behind. Several packages have major breaking changes that require careful migration.

## What Changes

### Tier 1: Critical Security & Minor Updates (No Breaking Changes)
These can be updated immediately with minimal risk:

| Package | Current | Target | Notes |
|---------|---------|--------|-------|
| axios | 1.9.0 | 1.13.2 | Security fix (DoS vulnerability) |
| @playwright/test | 1.50.1 | 1.57.0 | Security fix (SSL cert verification) |
| eslint | 9.20.1 | 9.39.2 | Security fix (@eslint/plugin-kit ReDoS) |
| next | 15.3.8 | 15.5.9 | Security fixes (CVE-2025-55184, CVE-2025-55183) |
| bullmq | 5.41.9 | 5.66.6 | Minor update |
| framer-motion | 12.9.2 | 12.28.1 | Minor update |
| @tanstack/react-query | 5.74.4 | 5.90.19 | Minor update |
| react | 19.0.3 | 19.2.3 | Minor update |
| react-dom | 19.0.3 | 19.2.3 | Minor update |
| All @radix-ui packages | Various | Latest | Minor updates |
| All @fullcalendar packages | 6.1.15 | 6.1.20 | Minor updates |

### Tier 2: Major Updates with Migration Required

#### **BREAKING** Next.js 15 → 16
| Package | Current | Target | Breaking Changes |
|---------|---------|--------|------------------|
| next | 15.3.8 | 16.1.4 | - `middleware.ts` → `proxy.ts` rename required |
| | | | - Async params/searchParams now mandatory |
| | | | - Node.js 20.9.0 minimum |
| | | | - `revalidateTag()` API changes |
| eslint-config-next | 15.1.6 | 16.1.4 | Match Next.js version |

#### **BREAKING** TailwindCSS 3 → 4
| Package | Current | Target | Breaking Changes |
|---------|---------|--------|------------------|
| tailwindcss | 3.4.17 | 4.1.18 | - CSS-first config (no JS config file) |
| | | | - New @theme directive |
| | | | - Remove @tailwind directives |
| | | | - Border/ring defaults changed |
| | | | - Requires Safari 16.4+, Chrome 111+ |
| prettier-plugin-tailwindcss | 0.5.14 | 0.7.2 | Tailwind v4 compatibility |
| tailwind-merge | 2.6.0 | 3.4.0 | Tailwind v4 compatibility |
| @tailwindcss/forms | 0.5.10 | 0.5.11 | Minor |
| @tailwindcss/typography | 0.5.19 | Latest | Minor |

#### **BREAKING** Prisma 6 → 7
| Package | Current | Target | Breaking Changes |
|---------|---------|--------|------------------|
| prisma | 6.3.1 | 7.3.0 | - New `prisma.config.ts` required |
| | | | - Driver adapters required (`@prisma/adapter-pg`) |
| | | | - Automatic seeding removed |
| | | | - `--skip-generate` flag removed |
| | | | - Client output location changed |
| @prisma/client | 6.3.1 | 7.3.0 | Match Prisma version |

#### **BREAKING** Zustand 4 → 5
| Package | Current | Target | Breaking Changes |
|---------|---------|--------|------------------|
| zustand | 4.5.6 | 5.0.10 | - No default exports |
| | | | - React 18 minimum (already satisfied) |
| | | | - Custom equality requires `createWithEqualityFn` |
| | | | - Persist middleware behavior changed |

#### **BREAKING** Zod 3 → 4
| Package | Current | Target | Breaking Changes |
|---------|---------|--------|------------------|
| zod | 3.25.76 | 4.3.5 | - Error customization API changes |
| | | | - `.merge()` → `.extend()` |
| | | | - `.nativeEnum()` deprecated |
| | | | - ZodError: `.errors` → `.issues` |
| | | | - Default values in optional fields behavior |
| @hookform/resolvers | 4.1.3 | 5.2.2 | Zod v4 compatibility |

#### **BREAKING** Stripe SDKs
| Package | Current | Target | Breaking Changes |
|---------|---------|--------|------------------|
| stripe | 18.0.0 | 20.2.0 | - API version 2025-11-17.clover |
| | | | - V2.Event → V2.Core.Events |
| | | | - parseThinEvent → parseEventNotification |
| @stripe/stripe-js | 7.2.0 | 8.6.3 | Major version |
| @stripe/react-stripe-js | 3.6.0 | 5.4.1 | Major version |

### Tier 3: Other Major Updates

| Package | Current | Target | Notes |
|---------|---------|--------|-------|
| date-fns | 3.6.0 | 4.1.0 | First-class timezone support, minimal breaking changes |
| googleapis | 144.0.0 | 170.1.0 | Major version bump |
| lucide-react | 0.475.0 | 0.562.0 | Icon updates |
| bcrypt | 5.1.1 | 6.0.0 | Build system change (prebuildify) |
| @azure/msal-node | 3.2.2 | 5.0.2 | Major version |
| uuid | 11.0.5 | 13.0.0 | Major version |
| better-sqlite3 | 11.8.1 | 12.6.2 | Major version |
| jest | 29.7.0 | 30.2.0 | Major version |
| @types/jest | 29.5.14 | 30.0.0 | Match Jest |
| @types/node | 20.17.19 | 25.0.10 | Node.js 20+ types |
| @types/bcrypt | 5.0.2 | 6.0.0 | Match bcrypt |
| lint-staged | 15.5.0 | 16.2.7 | Major version |
| resend | 4.1.2 | 6.8.0 | Major version |

### Tier 4: Deprecation & Removal
| Package | Action | Reason |
|---------|--------|--------|
| date-fns-tz | Remove | Merged into date-fns v4 |
| @trivago/prettier-plugin-sort-imports | Update to 6.0.2 | Major version |

## Security Vulnerabilities Addressed

| Severity | Count | Key Issues |
|----------|-------|------------|
| Critical | 1 | form-data (unsafe random for boundary) |
| High | 10 | axios DoS, glob command injection, jws signature verification, qs DoS, tar path traversal, playwright SSL |
| Moderate | 4 | js-yaml prototype pollution, lodash prototype pollution, next cache issues |
| Low | 6 | Various |

## Impact

### Affected Code
- `middleware.ts` → Must rename to `proxy.ts` (Next.js 16)
- `tailwind.config.ts` → Must migrate to CSS-first config
- `prisma/schema.prisma` → Must add `prisma.config.ts`, use driver adapters
- All Zustand stores → May need import changes
- All Zod schemas → Must update deprecated methods
- Stripe webhook handlers → Must update event type paths
- `src/lib/db/prisma.ts` → Must update client instantiation

### Affected Specs
- None (infrastructure/tooling change)

### Browser Support Impact
TailwindCSS v4 requires:
- Safari 16.4+ (released March 2023)
- Chrome 111+ (released March 2023)
- Firefox 128+ (released July 2024)

This should be acceptable for a modern SaaS application.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking changes missed | Medium | High | Comprehensive testing, staged rollout |
| Build failures | Medium | Medium | Run CI after each tier |
| Runtime errors | Medium | High | Full E2E test suite |
| Type errors | High | Low | TypeScript will catch during build |

## Recommended Approach

**Phased Implementation:**
1. **Phase 1**: Security fixes only (Tier 1 minor updates) - Low risk
2. **Phase 2**: TailwindCSS v4 migration - Medium risk, isolated to styling
3. **Phase 3**: Prisma v7 migration - Medium risk, requires schema changes
4. **Phase 4**: Next.js 16 migration - Medium risk, middleware changes
5. **Phase 5**: Zustand v5 + Zod v4 - Medium risk, state management
6. **Phase 6**: Stripe SDK updates - Medium risk, payment handling
7. **Phase 7**: Remaining updates - Low risk

Each phase should be a separate commit/PR for easy rollback.
