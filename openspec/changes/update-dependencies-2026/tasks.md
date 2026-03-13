# Tasks: Update All Dependencies to Latest Versions

## Prerequisites
- [ ] 0.1 Create a new git branch for dependency updates
- [ ] 0.2 Ensure all tests pass on current codebase (`npm run test:unit`, `npm run test:e2e`)
- [ ] 0.3 Ensure TypeScript compilation passes (`npm run type-check`)
- [ ] 0.4 Ensure linting passes (`npm run lint`)
- [ ] 0.5 Backup current `package.json` and `package-lock.json`

## Phase 1: Security Fixes & Minor Updates (Low Risk)
- [ ] 1.1 Update axios to 1.13.2 (security fix)
- [ ] 1.2 Update @playwright/test to 1.57.0 (security fix)
- [ ] 1.3 Update eslint to 9.39.2 (security fix)
- [ ] 1.4 Update next to 15.5.9 (security fixes within v15)
- [ ] 1.5 Update react and react-dom to 19.2.3
- [ ] 1.6 Update all @radix-ui packages to latest within current major
- [ ] 1.7 Update all @fullcalendar packages to 6.1.20
- [ ] 1.8 Update @tanstack/react-query to 5.90.19
- [ ] 1.9 Update @tanstack/react-query-devtools to 5.91.2
- [ ] 1.10 Update bullmq to 5.66.6
- [ ] 1.11 Update framer-motion to 12.28.1
- [ ] 1.12 Update other minor/patch updates (ioredis, pg, postcss, prettier, etc.)
- [ ] 1.13 Run `npm audit fix` to address remaining auto-fixable vulnerabilities
- [ ] 1.14 Run type-check, lint, and tests
- [ ] 1.15 Commit Phase 1 changes

## Phase 2: TailwindCSS v4 Migration (Medium Risk)
- [ ] 2.1 Read TailwindCSS v4 upgrade guide: https://tailwindcss.com/docs/upgrade-guide
- [ ] 2.2 Run TailwindCSS upgrade tool: `npx @tailwindcss/upgrade`
- [ ] 2.3 Update tailwindcss to 4.1.18
- [ ] 2.4 Update prettier-plugin-tailwindcss to 0.7.2
- [ ] 2.5 Update tailwind-merge to 3.4.0
- [ ] 2.6 Migrate `tailwind.config.ts` to CSS-first configuration using @theme directive
- [ ] 2.7 Update main CSS file to use new `@import "tailwindcss"` syntax
- [ ] 2.8 Fix any border/ring default color changes in components
- [ ] 2.9 Fix any placeholder text color changes
- [ ] 2.10 Remove deprecated opacity utilities (bg-opacity-*, text-opacity-*)
- [ ] 2.11 Visual regression testing of all major pages
- [ ] 2.12 Run type-check, lint, and tests
- [ ] 2.13 Commit Phase 2 changes

## Phase 3: Prisma v7 Migration (Medium Risk)
- [ ] 3.1 Read Prisma v7 upgrade guide: https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7
- [ ] 3.2 Update prisma and @prisma/client to 7.3.0
- [ ] 3.3 Install driver adapters: `npm install @prisma/adapter-pg pg`
- [ ] 3.4 Install type definitions: `npm install -D @types/pg`
- [ ] 3.5 Create `prisma.config.ts` at project root with database configuration
- [ ] 3.6 Remove `url` from datasource block in `schema.prisma`
- [ ] 3.7 Update `src/lib/db/prisma.ts` to use driver adapters
- [ ] 3.8 Update generator provider from `prisma-client-js` to `prisma-client`
- [ ] 3.9 Update any `prisma migrate dev` scripts to not rely on auto-seeding
- [ ] 3.10 Update any scripts using removed CLI flags (--skip-generate, --skip-seed)
- [ ] 3.11 Run `npm run prisma:generate` explicitly
- [ ] 3.12 Test database connectivity with both PostgreSQL and SQLite
- [ ] 3.13 Run type-check, lint, and tests
- [ ] 3.14 Commit Phase 3 changes

## Phase 4: Next.js 16 Migration (Medium Risk)
- [ ] 4.1 Read Next.js 16 upgrade guide: https://nextjs.org/docs/app/guides/upgrading/version-16
- [ ] 4.2 Run Next.js codemod: `npx @next/codemod@canary upgrade latest`
- [ ] 4.3 Update next to 16.1.4
- [ ] 4.4 Update eslint-config-next to 16.1.4
- [ ] 4.5 Rename `middleware.ts` to `proxy.ts`
- [ ] 4.6 Update exported middleware function to `proxy`
- [ ] 4.7 Ensure all async params/searchParams are properly awaited
- [ ] 4.8 Update any `revalidateTag()` calls to include cacheLife profile
- [ ] 4.9 Remove any deprecated APIs (AMP, runtime configs, etc.)
- [ ] 4.10 Update any `.getStaticProps`/`.getServerSideProps` patterns
- [ ] 4.11 Test all routes and middleware behavior
- [ ] 4.12 Run type-check, lint, and tests
- [ ] 4.13 Commit Phase 4 changes

## Phase 5: State Management Updates (Medium Risk)

### Zustand v5
- [ ] 5.1 Read Zustand v5 migration guide: https://zustand.docs.pmnd.rs/migrations/migrating-to-v5
- [ ] 5.2 Update zustand to 5.0.10
- [ ] 5.3 Replace default imports with named imports in all stores
- [ ] 5.4 Replace `create` with `createWithEqualityFn` where custom equality is used
- [ ] 5.5 Review persist middleware usage for behavioral changes
- [ ] 5.6 Fix any infinite loop errors by using `useShallow`

### Zod v4
- [ ] 5.7 Read Zod v4 migration guide: https://zod.dev/v4/changelog
- [ ] 5.8 Update zod to 4.3.5
- [ ] 5.9 Update @hookform/resolvers to 5.2.2
- [ ] 5.10 Replace `.merge()` calls with `.extend()`
- [ ] 5.11 Replace `.nativeEnum()` calls with `.enum()`
- [ ] 5.12 Update error handling from `.errors` to `.issues`
- [ ] 5.13 Review optional field default value behavior changes
- [ ] 5.14 Run type-check, lint, and tests
- [ ] 5.15 Commit Phase 5 changes

## Phase 6: Stripe SDK Updates (Medium Risk)
- [ ] 6.1 Read Stripe SDK changelog: https://github.com/stripe/stripe-node/blob/master/CHANGELOG.md
- [ ] 6.2 Update stripe to 20.2.0
- [ ] 6.3 Update @stripe/stripe-js to 8.6.3
- [ ] 6.4 Update @stripe/react-stripe-js to 5.4.1
- [ ] 6.5 Update V2.Event references to V2.Core.Events
- [ ] 6.6 Update `parseThinEvent` calls to `parseEventNotification`
- [ ] 6.7 Update webhook event type interfaces
- [ ] 6.8 Review Stripe API version changes (2025-11-17.clover)
- [ ] 6.9 Test subscription checkout flow
- [ ] 6.10 Test webhook handling
- [ ] 6.11 Test customer portal
- [ ] 6.12 Run type-check, lint, and tests
- [ ] 6.13 Commit Phase 6 changes

## Phase 7: Remaining Major Updates (Low-Medium Risk)
- [ ] 7.1 Update date-fns to 4.1.0 and remove date-fns-tz (now included)
- [ ] 7.2 Update googleapis to 170.1.0
- [ ] 7.3 Update @azure/msal-node to 5.0.2
- [ ] 7.4 Update lucide-react to 0.562.0
- [ ] 7.5 Update bcrypt to 6.0.0 and @types/bcrypt to 6.0.0
- [ ] 7.6 Update uuid to 13.0.0
- [ ] 7.7 Update better-sqlite3 to 12.6.2
- [ ] 7.8 Update resend to 6.8.0
- [ ] 7.9 Update jest to 30.2.0 and related packages
- [ ] 7.10 Update lint-staged to 16.2.7
- [ ] 7.11 Update @types/node to 25.0.10
- [ ] 7.12 Update @trivago/prettier-plugin-sort-imports to 6.0.2
- [ ] 7.13 Update typescript to 5.9.3
- [ ] 7.14 Run type-check, lint, and tests
- [ ] 7.15 Commit Phase 7 changes

## Final Validation
- [ ] 8.1 Run full test suite: `npm run test:unit`
- [ ] 8.2 Run E2E tests: `npm run test:e2e`
- [ ] 8.3 Run type-check: `npm run type-check`
- [ ] 8.4 Run lint: `npm run lint`
- [ ] 8.5 Test development build: `npm run dev`
- [ ] 8.6 Test production build: `npm run build`
- [ ] 8.7 Test open-source build: `npm run build:os`
- [ ] 8.8 Test worker build: `npm run build:worker`
- [ ] 8.9 Run `npm audit` to verify no remaining vulnerabilities
- [ ] 8.10 Manual testing of critical flows:
  - [ ] 8.10.1 User authentication (login, logout, register)
  - [ ] 8.10.2 Calendar view and event creation
  - [ ] 8.10.3 Task creation and scheduling
  - [ ] 8.10.4 Calendar sync (Google, Outlook)
  - [ ] 8.10.5 Subscription checkout (SaaS)
  - [ ] 8.10.6 Admin dashboard (SaaS)
- [ ] 8.11 Update openspec/project.md with new version numbers if needed
- [ ] 8.12 Create final commit with all changes
- [ ] 8.13 Create PR for review
