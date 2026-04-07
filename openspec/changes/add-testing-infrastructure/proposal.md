# Change: Implement Comprehensive Testing Infrastructure

## Why

FluidCalendar currently has minimal test coverage (~2% as noted in docs/version2.md) with only one unit test file and one E2E test file. The version2.md document targets 80%+ test coverage as a critical improvement area. A robust testing infrastructure is essential for:

1. **Code Quality**: Catch bugs before they reach production
2. **Confidence in Refactoring**: Enable safe code changes with comprehensive regression testing
3. **CI/CD Integration**: Automated quality gates preventing broken code from being deployed
4. **Documentation**: Tests serve as executable documentation of expected behavior

Based on research of 2025 best practices, this proposal recommends:
- **Vitest** over Jest for unit/integration testing (faster, better ESM support, simpler setup for Next.js 15)
- **MSW 2.0** for API mocking (industry standard, reusable across environments)
- **Playwright** for E2E testing (already in use, needs enhanced configuration)
- **GitHub Actions** workflow for automated testing in CI/CD pipeline

## What Changes

### Testing Framework Migration
- **Migrate from Jest to Vitest** for unit and integration testing
  - Vitest provides faster execution, native ESM support, and better Next.js 15 compatibility
  - Nearly identical API makes migration straightforward
  - Better support for React 19 and async components

### MSW 2.0 Integration
- **Add Mock Service Worker** for API mocking
  - Network-level interception (not just fetch patching)
  - Reusable handlers across tests and development
  - Type-safe request/response handling

### Enhanced Test Configuration
- **Update Vitest configuration** with proper Next.js paths and environment
- **Add test setup files** for React Testing Library and MSW
- **Configure coverage thresholds** (70% minimum for new code)

### CI/CD Integration
- **Create new GitHub Actions workflow** (`test.yml`) that runs:
  - Linting and type checking
  - Unit/integration tests with Vitest
  - E2E tests with Playwright (on PR to main/staging)
  - Coverage reporting
- **Add caching** for dependencies and Playwright browsers
- **Run tests before deployment** (blocking gate)

### Test Organization
- **Establish test directory conventions**:
  - `src/**/__tests__/*.test.ts` for unit tests
  - `src/**/__tests__/*.integration.test.ts` for integration tests
  - `tests/*.spec.ts` for E2E tests
  - `src/mocks/` for MSW handlers

## Impact

### Affected Code
- `package.json` - New dependencies and scripts
- `jest.config.js` - Remove (replaced by vitest.config.ts)
- `vitest.config.ts` - New configuration file
- `playwright.config.ts` - Enhanced configuration
- `.github/workflows/test.yml` - New CI workflow
- `.github/workflows/deploy.saas.yml` - Add test dependency
- `.github/workflows/deploy.staging.saas.yml` - Add test dependency
- `src/mocks/` - New MSW handlers directory
- `src/tests/` - Test utilities and setup files

### Affected Specs
- Creates new `testing-infrastructure` capability specification

### Dependencies
- Add: `vitest`, `@vitest/ui`, `@vitest/coverage-v8`, `happy-dom`
- Add: `msw` (Mock Service Worker 2.0)
- Add: `@testing-library/react`, `@testing-library/user-event`
- Remove: `jest`, `ts-jest`, `jest-environment-jsdom`, `@types/jest`

### Breaking Changes
- **Test command change**: `npm run test:unit` will now use Vitest instead of Jest
- Existing test files may need minor adjustments for Vitest compatibility (mostly import changes)

### Risk Mitigation
- Vitest API is nearly identical to Jest - migration is low-risk
- Existing E2E tests with Playwright remain unchanged
- Gradual rollout possible - can run both frameworks during transition
