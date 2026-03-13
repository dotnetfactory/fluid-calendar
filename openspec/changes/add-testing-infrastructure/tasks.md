# Tasks: Implement Testing Infrastructure

## 1. Vitest Setup & Jest Migration

### 1.1 Install Dependencies
- [ ] 1.1.1 Install Vitest and related packages:
  ```bash
  npm install -D vitest @vitest/ui @vitest/coverage-v8 @vitejs/plugin-react vite-tsconfig-paths happy-dom
  ```
- [ ] 1.1.2 Install React Testing Library (if not present):
  ```bash
  npm install -D @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom
  ```
- [ ] 1.1.3 Remove Jest dependencies:
  ```bash
  npm uninstall jest ts-jest jest-environment-jsdom @types/jest
  ```

### 1.2 Create Vitest Configuration
- [ ] 1.2.1 Create `vitest.config.ts` in project root with:
  - happy-dom environment
  - Path aliases matching tsconfig
  - Coverage configuration (v8 provider, 70% thresholds)
  - Setup files reference
  - Test file patterns

### 1.3 Remove Jest Configuration
- [ ] 1.3.1 Delete `jest.config.js`
- [ ] 1.3.2 Remove any Jest-related entries from package.json

### 1.4 Update Package Scripts
- [ ] 1.4.1 Update `test:unit` script to use Vitest
- [ ] 1.4.2 Add `test:unit:ui` script for Vitest UI
- [ ] 1.4.3 Add `test:unit:coverage` script for coverage report
- [ ] 1.4.4 Add `test:unit:watch` script for watch mode

## 2. MSW Setup

### 2.1 Install MSW
- [ ] 2.1.1 Install MSW 2.0:
  ```bash
  npm install -D msw
  ```

### 2.2 Create Handler Structure
- [ ] 2.2.1 Create `src/mocks/handlers/` directory
- [ ] 2.2.2 Create `src/mocks/handlers/auth.ts` with auth endpoint handlers
- [ ] 2.2.3 Create `src/mocks/handlers/tasks.ts` with task endpoint handlers
- [ ] 2.2.4 Create `src/mocks/handlers/calendar.ts` with calendar endpoint handlers
- [ ] 2.2.5 Create `src/mocks/handlers.ts` combining all handlers

### 2.3 Create Server Setup
- [ ] 2.3.1 Create `src/mocks/server.ts` for Node.js test environment
- [ ] 2.3.2 Configure server lifecycle (listen, resetHandlers, close)

## 3. Test Utilities Setup

### 3.1 Create Test Setup File
- [ ] 3.1.1 Create `src/tests/setup.ts` with:
  - @testing-library/jest-dom extension import
  - MSW server lifecycle hooks
  - Global test environment configuration

### 3.2 Create Custom Render Utility
- [ ] 3.2.1 Create `src/tests/test-utils.tsx` with:
  - Custom render function wrapping providers (QueryClient, etc.)
  - Re-export @testing-library/react utilities
  - Type definitions for custom render

### 3.3 Create Test Fixtures
- [ ] 3.3.1 Create `src/tests/fixtures/` directory
- [ ] 3.3.2 Create `src/tests/fixtures/user.ts` with user factory
- [ ] 3.3.3 Create `src/tests/fixtures/task.ts` with task factory
- [ ] 3.3.4 Create `src/tests/fixtures/calendar.ts` with calendar event factory

## 4. Migrate Existing Tests

### 4.1 Update Date Utils Test
- [ ] 4.1.1 Update imports in `src/lib/__tests__/date-utils.test.ts`:
  - Change `describe`, `test`, `expect` imports to Vitest
- [ ] 4.1.2 Run test to verify it passes with Vitest

## 5. Playwright Configuration Enhancement

### 5.1 Update Playwright Config
- [ ] 5.1.1 Update `playwright.config.ts` with:
  - Multiple reporters (html, json for CI)
  - Screenshot on failure
  - Video on first retry
  - Enhanced timeout configuration
  - CI-specific settings

### 5.2 Add Playwright CI Configuration
- [ ] 5.2.1 Configure sharding for future parallelization
- [ ] 5.2.2 Add artifact upload configuration

## 6. CI/CD Integration

### 6.1 Create Test Workflow
- [ ] 6.1.1 Create `.github/workflows/test.yml` with:
  - Trigger on PR to main and staging
  - Trigger on push to main and staging
  - Node.js setup with caching
  - Lint and type-check job
  - Unit test job with coverage
  - E2E test job (conditional on PR/push to main/staging)
  - Artifact upload for test results and coverage

### 6.2 Update Deployment Workflows
- [ ] 6.2.1 Update `.github/workflows/deploy.saas.yml`:
  - Add `needs: test` dependency (reference test workflow)
  - Or add inline test steps before deployment
- [ ] 6.2.2 Update `.github/workflows/deploy.staging.saas.yml`:
  - Add `needs: test` dependency (reference test workflow)
  - Or add inline test steps before deployment

### 6.3 Configure Caching
- [ ] 6.3.1 Add npm dependency caching in test workflow
- [ ] 6.3.2 Add Playwright browser caching in test workflow
- [ ] 6.3.3 Add .next build cache for E2E tests

## 7. Sample Tests

### 7.1 Add API Route Test Example
- [ ] 7.1.1 Create `src/app/api/health/__tests__/route.test.ts` as example
- [ ] 7.1.2 Document API testing pattern

### 7.2 Add Component Test Example
- [ ] 7.2.1 Create simple component test example (e.g., Button component)
- [ ] 7.2.2 Document component testing pattern with MSW

### 7.3 Add Integration Test Example
- [ ] 7.3.1 Create integration test example (e.g., TaskList with API)
- [ ] 7.3.2 Document integration testing pattern

## 8. Documentation

### 8.1 Update CLAUDE.md
- [ ] 8.1.1 Update Testing Strategy section with new tools
- [ ] 8.1.2 Add testing patterns and conventions
- [ ] 8.1.3 Document test file naming conventions
- [ ] 8.1.4 Add troubleshooting section for common test issues

### 8.2 Update project.md
- [ ] 8.2.1 Update testing tools in project conventions

## 9. Validation

### 9.1 Verify Setup
- [ ] 9.1.1 Run `npm run test:unit` and verify all tests pass
- [ ] 9.1.2 Run `npm run test:unit:coverage` and verify coverage report
- [ ] 9.1.3 Run `npm run test:e2e` locally and verify Playwright works
- [ ] 9.1.4 Run `npm run lint` and verify no new lint errors
- [ ] 9.1.5 Run `npm run type-check` and verify no TypeScript errors

### 9.2 Verify CI
- [ ] 9.2.1 Create test PR and verify test workflow runs
- [ ] 9.2.2 Verify deployment workflows wait for tests (if configured)
- [ ] 9.2.3 Verify artifacts are uploaded correctly

## Dependencies

- Task 1 (Vitest Setup) must complete before Task 4 (Migrate Tests)
- Task 2 (MSW Setup) must complete before Task 3.1 (Test Setup File)
- Task 3 (Test Utilities) must complete before Task 7 (Sample Tests)
- Tasks 1-5 must complete before Task 6 (CI/CD Integration)
- Tasks 1-7 must complete before Task 8 (Documentation)
- All tasks must complete before Task 9 (Validation)

## Parallelizable Work

The following can be done in parallel:
- Task 2 (MSW Setup) and Task 5 (Playwright Enhancement)
- Task 7.1, 7.2, 7.3 (Sample Tests) can be done in parallel after dependencies met
- Task 8.1 and 8.2 (Documentation) can be done in parallel
