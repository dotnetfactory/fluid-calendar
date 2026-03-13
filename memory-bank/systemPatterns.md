# System Patterns: Fluid Calendar

## Architecture Overview

Fluid Calendar follows a modern Next.js application architecture with clear separation of concerns.

## Key Technical Patterns

### 1. Component Organization

```
src/components/
  calendar/       # Calendar-specific components
  tasks/          # Task management components
  ui/             # Reusable UI components (using Shadcn)
```

### 2. State Management

- Zustand for global state management
- Local component state for UI-specific concerns
- State stores located in `src/store`

### 3. Database Access

- Prisma ORM for database operations
- Always use global Prisma instance from `@/lib/prisma`
- Database logic for calendars in `@calendar-db.ts`

### 4. External Service Integration

- OAuth flows for calendar service authentication
- Token refresh mechanisms for maintaining access
- Local data sync to maintain offline capability

### 5. Open Source vs SAAS Code Separation

- File extension pattern (.saas.tsx, .open.tsx)
- Directory structure separation (src/app/(saas), src/app/(open), src/app/(common))
- Feature flagging via `isSaasEnabled` and `isFeatureEnabled()`

### 6. Background Processing

- BullMQ for job management
- Jobs stored in `saas/jobs` directory

### 7. Admin Access Control

- `useAdmin` hook and `AdminOnly` component for access control
- `requireAdmin` middleware for API routes

### 8. Logging Infrastructure

- **Kubernetes-Native Logging**: Loki + Promtail + Grafana stack for log aggregation
- **Structured JSON Logging**: New unified logger in `src/lib/logger/index.ts`
- **App/Environment Detection**: Automatic labeling for fluid-calendar app with environment context
- **Container-First**: Logs output to stdout/stderr for container collection
- **Kubernetes Context Aware**: Namespace detection and proper labeling
- **Backward Compatible**: Maintains existing logger interface (`logger.info()`, `logger.error()`, etc.)

#### Logging Usage Pattern:
```typescript
import { logger } from "@/lib/logger";

const LOG_SOURCE = "ComponentName";

// Always specify log source as third parameter
logger.info("Operation completed", { userId, action }, LOG_SOURCE);
logger.error("Operation failed", { error: error.message }, LOG_SOURCE);
```

#### Infrastructure Components:
- **Loki**: Log aggregation and storage (`k8s-logging-setup/loki-config.yaml`)
- **Promtail**: Log collection DaemonSet (`k8s-logging-setup/promtail-config.yaml`)
- **Grafana**: Log visualization with Loki datasource integration

### 9. Date Handling

- Centralized date utilities in `@date-utils.ts`
- Avoid direct use of date-fns or date-fns-tz

### 10. Command Pattern

- Command palette (cmdk) for quick actions
- Commands registered in `src/lib/commands` or `@useCommands.ts`

### 11. Database Schema Patterns

- Clean separation of concerns in Prisma models
- User-centric data organization with proper relationships
- Removed legacy logging infrastructure for cleaner schema
- Migration-first approach for schema changes

### 12. Infrastructure Deployment

- Kubernetes-first deployment strategy
- Global logging infrastructure for multi-application support
- Resource optimization for node constraints
- Comprehensive deployment automation with `k8s-logging-setup/deploy.sh`
