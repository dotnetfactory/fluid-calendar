# Change: Migrate from Runtime Infisical to Kubernetes Secrets

## Why
The current setup uses Infisical CLI at runtime to fetch secrets, which:
1. Adds latency to every container startup (API call to Infisical)
2. Creates a runtime dependency on Infisical service availability
3. Requires Infisical CLI installed in the Docker image, increasing image size
4. Makes local debugging harder - secrets are opaque until runtime

Moving to pre-populated Kubernetes secrets eliminates these issues while maintaining security through git-ignored local files and CI/CD secret injection.

## What Changes
- **Remove Infisical CLI from Docker images** - No longer needed at runtime
- **Create secrets.yaml template** - Git-ignored file for K8s secrets (populated locally via Infisical CLI)
- **Update GitHub Actions** - Use Infisical CLI to export secrets during CI, then create K8s secrets directly
- **Modify K8s deployments** - Reference actual env vars from K8s secrets instead of Infisical connection params
- **Update package.json scripts** - Remove `infisical run` wrapper from production commands

## Impact
- Affected files:
  - `src/saas/Dockerfile.saas` - Remove Infisical CLI installation
  - `src/saas/k8s/deployment.yaml` - Update env var references
  - `src/saas/k8s/deployment.staging.saas.yaml` - Update env var references
  - `.github/workflows/deploy.saas.yml` - Add Infisical export step
  - `.github/workflows/deploy.staging.saas.yml` - Add Infisical export step
  - `package.json` - Simplify production scripts
  - `.gitignore` - Add secrets.yaml pattern
  - `src/saas/k8s/secrets.yaml` (new, git-ignored) - Template for local use

- **Breaking**: None - Existing secrets in Infisical remain the source of truth
- **Migration**: Seamless - CI/CD handles the transition
