## 1. Git Configuration
- [ ] 1.1 Add `src/saas/k8s/secrets*.yaml` pattern to `.gitignore`

## 2. Create Secrets Template
- [ ] 2.1 Create `src/saas/k8s/secrets.yaml.example` with placeholder structure (committed to repo)
- [ ] 2.2 Document local usage in template comments

## 3. Update GitHub Workflows
- [ ] 3.1 Update `deploy.saas.yml` to install Infisical CLI and export secrets
- [ ] 3.2 Update `deploy.saas.yml` to create K8s secret from exported env vars
- [ ] 3.3 Remove Infisical build args from Docker build step in `deploy.saas.yml`
- [ ] 3.4 Update `deploy.staging.saas.yml` with same changes as production workflow

## 4. Update Kubernetes Deployments
- [ ] 4.1 Update `deployment.yaml` - change env vars from Infisical params to actual app secrets
- [ ] 4.2 Update `deployment.yaml` - add all required env vars (DATABASE_URL, NEXTAUTH_SECRET, etc.)
- [ ] 4.3 Update `deployment.staging.saas.yaml` with same env var changes

## 5. Update Dockerfile
- [ ] 5.1 Remove Infisical CLI installation from builder stage
- [ ] 5.2 Remove Infisical CLI installation from runner stage
- [ ] 5.3 Remove `infisical run` from build commands (prisma generate, npm run build)
- [ ] 5.4 Remove Infisical-related ARG and ENV declarations

## 6. Update Package Scripts
- [ ] 6.1 Simplify `start:prod` to remove `infisical run` wrapper
- [ ] 6.2 Simplify `prisma:update` to remove `infisical run` wrapper
- [ ] 6.3 Simplify `start:worker:prod` to remove `infisical run` wrapper

## 7. Testing & Validation
- [ ] 7.1 Test Docker build locally without Infisical
- [ ] 7.2 Verify staging deployment works with new approach
- [ ] 7.3 Monitor staging for any secret-related issues
- [ ] 7.4 Deploy to production after staging validation
