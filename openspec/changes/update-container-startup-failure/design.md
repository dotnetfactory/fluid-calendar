## Context

Both development and self-hosted production images use the same POSIX shell entrypoint. Its unchecked Prisma commands currently fall through to application startup.

## Goals / Non-Goals

Require successful preparation before startup. Preserve readiness polling, connection settings, command arguments, and application exit status. No migration repair or schema changes.

## Decisions

Use POSIX `set -e` in the shared entrypoint. This stops failed preparation commands without duplicate guards and preserves the existing `while ! nc` readiness retry. Execute the real shell script in Jest with isolated command stubs so tests cannot contact a database.

## Risks / Trade-offs

Self-hosters with failed migrations will now see a stopped or restarting container. The changelog directs them to inspect the Prisma error, back up their database, repair the reported issue, and restart. No automatic migration reset is introduced.
