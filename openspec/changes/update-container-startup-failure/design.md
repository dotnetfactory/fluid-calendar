## Context

Both development and self-hosted production images use the same POSIX shell entrypoint. Its unchecked Prisma commands currently fall through to application startup.

## Goals / Non-Goals

Require successful preparation before startup. Preserve readiness polling, connection settings, command arguments, and application exit status. No migration repair or schema changes.

## Decisions

Use POSIX `set -e` in the shared entrypoint. This stops failed preparation commands without duplicate guards and preserves the existing `while ! nc` readiness retry. Execute the real shell script in Jest with isolated command stubs so tests cannot contact a database.

## Risks / Trade-offs

Self-hosters with failed migrations will now see a stopped or restarting container. The changelog directs them to inspect the Prisma error, back up their database, repair the reported issue, and restart. No automatic migration reset is introduced.

## Google task test failures

Five provider tests added in [PR 155](https://github.com/dotnetfactory/fluid-calendar/pull/155) asserted a startDate policy that the merged provider never implemented. The task-sync README, default mapper, provider, and separate mapper test use canonical `dueDate`, while `startDate` is local scheduling metadata. Correct those test expectations and strengthen exact value and clearing assertions, preserving the shipped date behavior. The Google API calls its wire field `due`; its current [reference](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks) describes a calendar date rather than a deadline. This change does not reinterpret existing stored dates.

The sixth failure exposes a real mismatch: the provider returns `completedDate`, while GoogleFieldMapper reads raw `completed`. Use the normalized field, remove redundant raw notes/due overrides, and clear completion when a task is reopened. Also include mapped completion in the sync manager's new-task write, matching its incoming-only path. An integrated provider-to-mapper-to-Prisma-boundary regression covers new, updated, and reopened tasks without contacting Google or a database.
