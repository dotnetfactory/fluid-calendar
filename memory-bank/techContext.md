# Technical Context: Fluid Calendar

## Core Technologies

### Frontend

- **Next.js 15 (App Router)**: React-based framework for server-side rendering and routing
- **React**: UI library for component-based development
- **TypeScript**: Typed JavaScript for enhanced developer experience
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Shadcn**: UI component library built on Radix primitives
- **FullCalendar**: JavaScript library for calendar display
- **Zustand**: State management library
- **React Icons**: Icon library

### Backend & Data

- **PostgreSQL**: SQL database for data storage
- **Prisma**: ORM for database access and migrations
- **BullMQ**: For background jobs and queue management
- **Zod**: For data validation

### Infrastructure & Monitoring

- **Kubernetes**: Container orchestration platform
- **Loki**: Log aggregation and storage system
- **Promtail**: Log collection agent (DaemonSet deployment)
- **Grafana**: Log visualization and monitoring dashboards
- **Docker**: For containerization and local development
- **Docker Compose**: For multi-container orchestration

### Development & Testing

- **Jest**: For testing
- **Playwright**: For end-to-end testing

## Project Setup

### Development Environment

- Node.js 18+ recommended
- Use `npm install --legacy-peer-deps` for installing dependencies
- Docker and Docker Compose for local services

### Configuration

- Environment variables for feature flags and service connections
- `NEXT_PUBLIC_ENABLE_SAAS_FEATURES` to control SaaS features

### Database

- Postgres database accessed via Prisma
- Migrations handled through Prisma
- Always use the global Prisma instance from `@/lib/prisma`

### Logging Infrastructure

- **Kubernetes Logging Stack**: Deployed in `kube-prometheus-stack` namespace
- **Loki Configuration**: Filesystem storage with `/tmp/loki` persistence
- **Promtail DaemonSet**: Collects logs from all containers with proper RBAC
- **Grafana Integration**: Loki datasource configured for log visualization
- **Deployment Scripts**: Automated setup in `k8s-logging-setup/deploy.sh`

#### Logging Architecture:

```
Application → stdout/stderr → Promtail → Loki → Grafana
```

#### Key Configuration Files:

- `k8s-logging-setup/loki-config.yaml` - Loki deployment and service
- `k8s-logging-setup/promtail-config.yaml` - Log collection DaemonSet with RBAC
- `k8s-logging-setup/grafana-datasource.yaml` - Loki datasource for Grafana

### API Routes

- App Router API routes pattern:

```typescript
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Implementation
  }
}
```

## External Services

- Google Calendar API
- Outlook/Microsoft Graph API
- CalDAV servers

## Deployment

### Local Development

- Docker-based development environment
- PostgreSQL container via Docker Compose
- Local logger outputs to console for development

### Production Infrastructure

- Kubernetes cluster deployment
- Loki-based logging infrastructure
- Grafana monitoring at https://grafana.hub.elitecoders.ai/
- Separate configurations for open source and SaaS versions
- Environment-specific settings via environment variables

### Infrastructure Monitoring

- **Prometheus**: Metrics collection (existing kube-prometheus-stack)
- **Grafana**: Unified monitoring dashboard for metrics and logs
- **Loki**: Centralized log aggregation with structured JSON logs
- **Alert Manager**: For production alerting (part of prometheus stack)

## Migration Notes

### Recent Infrastructure Changes

- **Migrated from database-based logging to Kubernetes-native logging**
- **Removed ~2000+ lines of legacy logging code**
- **Implemented structured JSON logging with app/environment detection**
- **Deployed global Loki stack for multi-application log aggregation**
- **Cleaned database schema removing Log model and logging settings**
