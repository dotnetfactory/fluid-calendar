# Migration Guide: Custom Logger to Loki-based Logging

This guide walks you through migrating from your current database-based logging system to the new Loki-based centralized logging.

## Overview

**Current System:**
- Custom logger stores logs in PostgreSQL via Prisma
- Server-side and client-side logging
- Log retention managed by cleanup jobs
- Logs accessed via database queries

**New System:**
- Structured JSON logs output to stdout/stderr
- Promtail collects logs from all containers
- Loki aggregates and stores logs efficiently
- Grafana provides powerful log querying and visualization

## Migration Steps

### 1. Deploy Logging Infrastructure

First, deploy the Loki stack to your cluster:

```bash
cd k8s-logging-setup
chmod +x deploy.sh
./deploy.sh
```

This will:
- Deploy Loki for log storage
- Deploy Promtail for log collection
- Add Loki as a data source to your existing Grafana
- Restart Grafana to load the new data source

### 2. Update Your Logger Implementation

Replace your current logger with the new implementation:

```bash
# Backup current logger
cp src/lib/logger/index.ts src/lib/logger/index-old.ts

# Replace with new logger
cp src/lib/logger/index-new.ts src/lib/logger/index.ts
```

### 3. Remove Database Dependencies

#### 3.1 Update Prisma Schema

Remove the log table from your Prisma schema:

```prisma
// Remove this model from schema.prisma
model Log {
  id        String   @id @default(cuid())
  level     String
  message   String
  metadata  Json?
  timestamp DateTime @default(now())
  source    String?
  expiresAt DateTime?

  @@map("logs")
}
```

#### 3.2 Create Migration

```bash
npx prisma migrate dev --name remove_logs_table
```

#### 3.3 Remove Server Logger

Delete or comment out the server logger since we're not using database storage:

```typescript
// src/lib/logger/server.ts - can be removed
// src/lib/logger/client.ts - can be simplified
```

### 4. Update Application Code

#### 4.1 Enhanced Logging Examples

The new logger provides better structured logging:

```typescript
import { logger } from "@/lib/logger";

// API Route logging
export async function GET(request: Request) {
  const start = Date.now();
  
  try {
    // Your API logic
    const result = await someOperation();
    
    await logger.logAPIRequest(
      "GET",
      "/api/example",
      200,
      Date.now() - start,
      { user_id: "user123", request_id: "req456" }
    );
    
    return Response.json(result);
  } catch (error) {
    await logger.error("API request failed", {
      error: error.message,
      request_id: "req456",
      user_id: "user123"
    }, "api");
    
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

// Background job logging
await logger.logJob("calendar-sync", "started", { user_id: "user123" });
try {
  await syncCalendar();
  await logger.logJob("calendar-sync", "completed", { user_id: "user123" });
} catch (error) {
  await logger.logJob("calendar-sync", "failed", { 
    user_id: "user123",
    error: error.message 
  });
}

// Database operation logging
const start = Date.now();
const users = await prisma.user.findMany();
await logger.logDBOperation("SELECT", "users", Date.now() - start);
```

#### 4.2 Remove Log Cleanup Jobs

Remove any existing log cleanup jobs since Loki handles retention automatically:

```typescript
// Remove from your job processors or cron jobs
// No longer needed:
// - Log cleanup jobs
// - Log retention policies
// - Database log queries
```

### 5. Update Environment Variables

Add these environment variables to your deployment:

```yaml
# In your Kubernetes deployment
env:
- name: ENABLE_DEBUG_LOGS
  value: "false"  # Set to "true" for debug logs in production
```

### 6. Deploy Updated Application

Deploy your updated application with the new logger:

```bash
# Build and deploy as usual
npm run build
# Your existing deployment process
```

### 7. Verify Logging

#### 7.1 Check Logs in Grafana

1. Go to https://grafana.hub.elitecoders.ai/
2. Navigate to Explore
3. Select "Loki" as the data source
4. Try these queries:

```logql
# All fluid-calendar logs
{namespace="fluid-calendar"}

# Error logs only
{namespace="fluid-calendar"} |= "error"

# Specific service logs
{namespace="fluid-calendar", service="fluid-calendar"}

# API request logs
{namespace="fluid-calendar"} | json | source="api"

# Logs for specific user
{namespace="fluid-calendar"} | json | user_id="user123"
```

#### 7.2 Verify Log Structure

Your logs should now look like this:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "message": "GET /api/calendars 200",
  "service": "fluid-calendar",
  "environment": "production",
  "source": "api",
  "metadata": {
    "http_method": "GET",
    "http_path": "/api/calendars",
    "http_status": 200,
    "duration_ms": 45
  },
  "request_id": "req-456",
  "user_id": "user123"
}
```

## Benefits of New System

### ✅ Advantages

1. **No Database Overhead**: Logs don't consume database resources
2. **Better Performance**: No database writes for every log entry
3. **Centralized**: All application logs in one place
4. **Scalable**: Loki handles high log volumes efficiently
5. **Rich Querying**: LogQL provides powerful log analysis
6. **Automatic Collection**: No manual log shipping setup
7. **Kubernetes Native**: Automatically includes pod/container metadata

### 📊 Cost Savings

- **Database**: Reduced database storage and I/O
- **Compute**: No log cleanup jobs needed
- **Storage**: Loki's efficient compression
- **Maintenance**: Less database maintenance

## Troubleshooting

### Logs Not Appearing

1. Check Promtail is running:
```bash
kubectl get pods -n kube-prometheus-stack | grep promtail
```

2. Check Loki is healthy:
```bash
kubectl get pods -n kube-prometheus-stack | grep loki
kubectl logs deployment/loki -n kube-prometheus-stack
```

3. Verify your application is outputting JSON logs:
```bash
kubectl logs deployment/fluid-calendar -n fluid-calendar
```

### Grafana Data Source Issues

1. Check if Loki data source was added:
```bash
kubectl get configmap grafana-loki-datasource -n kube-prometheus-stack
```

2. Restart Grafana if needed:
```bash
kubectl rollout restart deployment/kube-prometheus-stack-grafana -n kube-prometheus-stack
```

### Performance Issues

1. Adjust Loki retention if needed
2. Reduce log verbosity in production
3. Monitor Loki resource usage

## Rollback Plan

If you need to rollback:

1. Restore old logger:
```bash
cp src/lib/logger/index-old.ts src/lib/logger/index.ts
```

2. Restore Prisma schema and migrate
3. Redeploy application
4. Optionally remove Loki stack:
```bash
kubectl delete -f k8s-logging-setup/
```

## Next Steps

1. **Set up Alerts**: Create log-based alerts in Grafana
2. **Create Dashboards**: Build operational dashboards
3. **Log Analysis**: Use LogQL for troubleshooting
4. **Performance Monitoring**: Monitor log volume and performance
5. **Team Training**: Train team on new logging system

## Support

- **Grafana**: https://grafana.hub.elitecoders.ai/
- **LogQL Documentation**: https://grafana.com/docs/loki/latest/logql/
- **Troubleshooting**: Check pod logs and Grafana explore section 