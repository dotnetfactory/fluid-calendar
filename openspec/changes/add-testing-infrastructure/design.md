# Design: Testing Infrastructure

## Context

FluidCalendar is a Next.js 15 / React 19 application with minimal test coverage. The docs/version2.md document identifies testing as a critical improvement area, targeting 80%+ coverage from the current ~2%.

**Current State:**
- Jest configured but rarely used (1 unit test file)
- Playwright configured for E2E (1 test file, Google Calendar integration)
- No API mocking infrastructure
- No CI/CD test integration (deploys without running tests)

**Stakeholders:**
- Developers needing fast feedback loops
- CI/CD pipeline requiring quality gates
- Future contributors requiring test examples

**Constraints:**
- Next.js 15 App Router with Server Components
- React 19 with async components (limited Vitest support for async SC)
- Dual-version architecture (SaaS/Open-source)
- Must work with existing Prisma/PostgreSQL stack

## Goals / Non-Goals

### Goals
- Establish testing infrastructure that enables 80%+ coverage over time
- Integrate tests into CI/CD pipeline as deployment gates
- Provide fast feedback during development (< 30 second test runs)
- Support testing of API routes, React components, and critical flows
- Enable API mocking for isolated unit/integration tests

### Non-Goals
- Immediately achieving 80% coverage (infrastructure first, coverage grows over time)
- Visual regression testing (can be added later)
- Load/performance testing (separate concern)
- Testing async Server Components with Vitest (use E2E instead per Next.js guidance)

## Decisions

### Decision 1: Vitest over Jest

**What**: Use Vitest as the primary unit/integration test runner, replacing Jest.

**Why**:
- **Performance**: Vitest uses Vite's transform pipeline and runs tests in parallel with minimal overhead
- **ESM Support**: Native ESM support without configuration headaches
- **Next.js 15 Compatibility**: Better handling of Next.js module compilation
- **Developer Experience**: Watch mode with HMR-like speed, built-in UI
- **Migration Ease**: API is nearly identical to Jest

**Alternatives Considered**:
- **Keep Jest**: More mature but requires significant configuration for Next.js 15/React 19, slower test execution
- **Playwright Component Testing**: Good option but less mature than traditional unit testing approaches

**Sources**:
- [Next.js Testing Guide - Vitest](https://nextjs.org/docs/app/guides/testing/vitest)
- [Setting up Vitest for Next.js 15](https://www.wisp.blog/blog/setting-up-vitest-for-nextjs-15)

### Decision 2: MSW 2.0 for API Mocking

**What**: Use Mock Service Worker (MSW) 2.0 for intercepting and mocking API requests.

**Why**:
- **Network-level interception**: Works regardless of HTTP client (fetch, axios, etc.)
- **Reusable handlers**: Same mocks work in tests, Storybook, and development
- **Type-safe**: Full TypeScript support for request/response typing
- **Industry standard**: Widely adopted, well-maintained

**Alternatives Considered**:
- **Manual fetch mocking**: Brittle, doesn't work with all clients
- **Nock**: Node-only, doesn't work in browser tests
- **Mirage.js**: Heavier, more suited to full mock servers

**Sources**:
- [MSW Documentation](https://mswjs.io/)
- [Using MSW with Vitest](https://stevekinney.com/courses/testing/testing-with-mock-service-worker)

### Decision 3: happy-dom over jsdom

**What**: Use happy-dom as the test environment instead of jsdom.

**Why**:
- **Performance**: 2-3x faster than jsdom for most operations
- **Modern APIs**: Better support for modern web APIs
- **Maintained**: Actively developed with good Next.js compatibility

**Alternatives Considered**:
- **jsdom**: More mature but slower, heavier
- **Browser-based testing**: Better fidelity but slower for unit tests

### Decision 4: Separate CI Workflow

**What**: Create a dedicated `test.yml` workflow separate from deployment workflows.

**Why**:
- **Separation of concerns**: Testing logic isolated from deployment logic
- **Reusability**: Can be triggered independently or as a dependency
- **Faster feedback**: Tests run on all PRs, not just deployment branches
- **Maintainability**: Easier to modify test configuration without affecting deployments

**Pattern**:
```yaml
# test.yml - runs on all PRs
# deploy.*.yml - depends on test.yml passing
```

### Decision 5: Coverage Thresholds

**What**: Set initial coverage thresholds at 70% with gradual increase target.

**Why**:
- **Realistic starting point**: Current coverage is ~2%, jumping to 80% immediately is unrealistic
- **Gradual improvement**: Threshold can be raised as coverage improves
- **New code enforcement**: Require 70%+ for new/modified code paths

**Configuration**:
```typescript
coverage: {
  thresholds: {
    statements: 70,
    branches: 70,
    functions: 70,
    lines: 70
  }
}
```

## Architecture

### Test File Organization

```
fluid-calendar-saas/
├── src/
│   ├── mocks/                    # MSW handlers
│   │   ├── handlers/             # Domain-specific handlers
│   │   │   ├── auth.ts
│   │   │   ├── tasks.ts
│   │   │   └── calendar.ts
│   │   ├── handlers.ts           # Combined handlers
│   │   ├── server.ts             # Node.js server setup
│   │   └── browser.ts            # Browser worker setup
│   ├── tests/                    # Test utilities
│   │   ├── setup.ts              # Global test setup
│   │   ├── test-utils.tsx        # Custom render with providers
│   │   └── fixtures/             # Test data factories
│   ├── lib/
│   │   └── __tests__/            # Unit tests co-located
│   │       └── date-utils.test.ts
│   ├── components/
│   │   └── tasks/
│   │       └── __tests__/
│   │           └── TaskList.test.tsx
│   └── app/
│       └── api/
│           └── tasks/
│               └── __tests__/
│                   └── route.test.ts
├── tests/                        # E2E tests (Playwright)
│   ├── auth.spec.ts
│   ├── tasks.spec.ts
│   └── google-calendar.spec.ts
├── vitest.config.ts              # Vitest configuration
├── playwright.config.ts          # Playwright configuration
└── .github/
    └── workflows/
        ├── test.yml              # New test workflow
        ├── deploy.saas.yml       # Modified to depend on tests
        └── deploy.staging.saas.yml
```

### CI/CD Pipeline Flow

```
PR Created/Updated
       │
       ▼
┌──────────────────┐
│    test.yml      │
│  ┌────────────┐  │
│  │ Lint +     │  │
│  │ Type Check │  │
│  └─────┬──────┘  │
│        │         │
│  ┌─────▼──────┐  │
│  │ Unit Tests │  │ (Vitest - parallel)
│  └─────┬──────┘  │
│        │         │
│  ┌─────▼──────┐  │
│  │ E2E Tests  │  │ (Playwright - on PR to main/staging)
│  └────────────┘  │
└────────┬─────────┘
         │
         ▼
   ┌───────────┐
   │  Merge    │
   └─────┬─────┘
         │
         ▼
┌──────────────────┐
│ deploy.*.yml     │
│ (depends on      │
│  test passing)   │
└──────────────────┘
```

## Risks / Trade-offs

### Risk 1: Vitest Migration Effort
- **Risk**: Existing Jest tests may need modifications
- **Mitigation**: Only 1 test file exists, migration is trivial
- **Monitoring**: Document any Jest-to-Vitest incompatibilities encountered

### Risk 2: async Server Components Testing
- **Risk**: Vitest cannot test async Server Components directly
- **Mitigation**: Use E2E tests (Playwright) for async SC, per Next.js recommendation
- **Monitoring**: Track Next.js/Vitest updates for improved support

### Risk 3: CI Time Increase
- **Risk**: Adding tests increases CI pipeline duration
- **Mitigation**:
  - Use parallel test execution
  - Cache dependencies and Playwright browsers
  - Run E2E only on PR to main/staging (not every commit)
- **Monitoring**: Track CI duration, optimize if > 10 minutes

### Risk 4: MSW Handler Maintenance
- **Risk**: Mock handlers can drift from actual API behavior
- **Mitigation**:
  - Use TypeScript for type-safe handlers
  - Sync handler updates with API changes in tasks.md
  - Consider contract testing for critical APIs

## Migration Plan

### Phase 1: Infrastructure Setup
1. Install Vitest and dependencies
2. Create vitest.config.ts
3. Add MSW and handler structure
4. Create test utilities and setup files
5. Remove Jest configuration

### Phase 2: Test Migration
1. Convert existing date-utils.test.ts to Vitest
2. Update imports (if needed)
3. Verify tests pass

### Phase 3: CI Integration
1. Create test.yml workflow
2. Update deployment workflows to depend on tests
3. Configure coverage reporting

### Phase 4: Baseline Tests
1. Add sample tests for each domain area
2. Document testing patterns
3. Update CLAUDE.md with testing guidance

### Rollback Plan
- Keep Jest dependencies in devDependencies until migration verified
- Can revert vitest.config.ts to jest.config.js if critical issues
- CI workflow uses separate file, can disable without affecting deployments

## Open Questions

1. **Coverage Reporting Service**: Should we integrate with Codecov or similar for coverage tracking over time?
   - Recommendation: Start without, add later if needed

2. **E2E Test Parallelization**: Should we shard Playwright tests across multiple workers?
   - Recommendation: Start with single worker, optimize when test suite grows

3. **Component Testing**: Should we add Playwright component testing for React components?
   - Recommendation: Use Vitest + RTL for now, evaluate component testing later
