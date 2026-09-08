## Why

Container startup currently launches the app even when Prisma generation or migrations fail. The operator approved stopping startup on failure, so broken migrations cannot leave an app serving against an incompatible schema.

## What Changes

- **BREAKING**: Stop the container entrypoint on Prisma generation or migration failure and preserve its nonzero exit status.
- Keep database readiness waits and successful command execution unchanged.
- Add an executable startup regression test and an upgrade note for self-hosters.

## Capabilities

### New Capabilities

- `container-startup`: Require successful Prisma preparation before starting the application.

### Modified Capabilities

None.

## Impact

`entrypoint.sh`, used by the shared Dockerfile and `docker/production/Dockerfile`; its regression test and changelog. No dependency or database schema changes.
