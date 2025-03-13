# FluidCalendar Development Guide

## Build & Run Commands
- `npm run dev` - Development server (Turbopack)
- `npm run build` - Build app (use `build:os` for non-SaaS build)
- `npm run lint` - Run ESLint
- `npm run test:unit` - Run all Jest tests
- `npx jest path/to/test.test.ts` - Run single test
- `npm run test:e2e` - Run Playwright tests
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run migrations
- `npm run prisma:studio` - Open Prisma Studio UI

## Code Style Guidelines
- **TypeScript**: Strict mode, use proper types for everything
- **Imports**: Use path alias `@/` for src directory imports
- **Components**: React functional components with TypeScript
- **Testing**: Tests in `__tests__` folders, use descriptive test names
- **State**: Zustand for state management in `src/store`
- **Errors**: Use custom logger implementation, handle errors with context
- **Naming**: PascalCase for components/types, camelCase for variables/functions
- **SaaS**: SaaS-specific files use `.saas.ts` suffix, feature flags for SaaS
- **Architecture**: Follow Next.js App Router pattern

When modifying code, mimic existing patterns and follow established conventions.