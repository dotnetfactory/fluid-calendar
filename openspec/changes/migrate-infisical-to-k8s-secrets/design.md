## Context
FluidCalendar currently uses Infisical CLI at runtime in Docker containers to inject environment variables. This requires:
1. Infisical CLI installed in every Docker image
2. Network access to Infisical API at container startup
3. `INFISICAL_TOKEN`, `PROJECT_ID`, `INFISICAL_SECRET_ENV`, `INFISICAL_API_URL` passed to K8s as secrets
4. All npm scripts wrapped with `infisical run`

The application runs on DigitalOcean Kubernetes with separate namespaces for production (`fluid-calendar`) and staging (`fluid-calendar-staging`).

## Goals / Non-Goals
**Goals:**
- Eliminate runtime dependency on Infisical service
- Reduce Docker image size (no Infisical CLI)
- Faster container startup (no API call to fetch secrets)
- Maintain Infisical as the source of truth for secrets
- Keep secrets out of git repository
- Simpler debugging (env vars visible in K8s secret)

**Non-Goals:**
- Changing which secrets exist in Infisical
- Supporting additional secret backends
- Implementing secret rotation (out of scope)

## Decisions

### Decision 1: Use Infisical CLI in CI/CD to Export Secrets
**What**: Run `infisical export` during GitHub Actions workflow to fetch secrets and create K8s secrets directly
**Why**:
- Keeps Infisical as single source of truth
- No secrets stored in GitHub (only INFISICAL_TOKEN)
- Secrets populated fresh on each deploy
**Alternatives considered**:
- Store secrets directly in GitHub Secrets: Rejected - would duplicate secret management
- Use External Secrets Operator: Rejected - adds complexity, requires cluster-wide operator

### Decision 2: Git-Ignored secrets.yaml for Local Development
**What**: Create `src/saas/k8s/secrets.yaml` template, add to `.gitignore`
**Why**:
- Developers can run `infisical export --format=yaml` locally to populate
- Enables `kubectl apply -f secrets.yaml` for local K8s testing
- No risk of committing secrets

### Decision 3: Simplified Production Scripts
**What**: Remove `infisical run` wrapper from `package.json` scripts
**Why**:
- Env vars injected directly by K8s from secrets
- Simpler startup, easier debugging
- `start:prod` becomes just `next start`

## Architecture

### Current Flow (Runtime Infisical)
```
GitHub Action -> Build Docker Image (with Infisical CLI)
             -> Push to Registry
             -> Deploy to K8s with INFISICAL_TOKEN secret

Pod Startup:  -> Container starts
              -> npm run start:prod
              -> infisical run fetches secrets from API
              -> Injects env vars
              -> next start runs
```

### New Flow (Pre-populated K8s Secrets)
```
GitHub Action -> Install Infisical CLI
             -> infisical export to fetch secrets
             -> Create K8s secret with actual env vars
             -> Build Docker Image (no Infisical CLI)
             -> Push to Registry
             -> Deploy to K8s referencing app-secrets

Pod Startup:  -> Container starts
              -> npm run start:prod
              -> Env vars already present from K8s secret
              -> next start runs immediately
```

### K8s Secret Structure
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: fluid-calendar
type: Opaque
stringData:
  DATABASE_URL: "postgresql://..."
  NEXTAUTH_SECRET: "..."
  GOOGLE_CLIENT_ID: "..."
  # ... all env vars from Infisical
```

### Deployment Environment Variables
```yaml
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: app-secrets
        key: DATABASE_URL
  - name: NEXTAUTH_SECRET
    valueFrom:
      secretKeyRef:
        name: app-secrets
        key: NEXTAUTH_SECRET
  # ... all env vars individually referenced
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Secrets visible in K8s (kubectl get secret) | RBAC controls, namespace isolation already in place |
| CI must have Infisical access | Already the case - just moves when secrets are fetched |
| Must redeploy to update secrets | Same as current behavior - container restart required |
| Larger K8s secret manifest | Acceptable - still small, generated dynamically |

## Migration Plan

1. **Update .gitignore** - Add `src/saas/k8s/secrets*.yaml` pattern
2. **Create secrets template** - Document format for local use
3. **Update GitHub workflows** - Add Infisical export step before deployment
4. **Update K8s deployments** - Change env var references
5. **Update Dockerfile** - Remove Infisical CLI installation
6. **Update package.json** - Simplify production scripts
7. **Test staging deployment** - Verify secrets work correctly
8. **Deploy to production** - Apply same changes

Rollback: Revert commits if issues arise - Infisical secrets remain unchanged.

## Open Questions
None - approach is straightforward and follows common K8s patterns.
