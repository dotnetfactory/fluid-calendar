## 1. Startup safety

- [x] 1.1 Add an executable regression test and observe generation and migration failure cases fail on the original entrypoint.
- [x] 1.2 Stop startup on preparation failure and preserve the successful startup path.
- [x] 1.3 Document the self-hosted upgrade behavior and run lint, type checks, unit tests, and strict spec validation.

## 2. Google task regression failures

- [x] 2.1 Trace the shipped provider, mapper, sync manager, README, and original PRs before correcting the five conflicting date assertions.
- [x] 2.2 Reproduce missing and stale completion timestamps through the real provider/mapper and fix normalized mapping plus the creation write.
- [x] 2.3 Run the full unit suite, lint, type check, build, and strict spec validation.

## Runtime dependency review finding

- [x] Reproduce the missing CLI in the published image recipe with networking disabled.
- [x] Bundle the locked Prisma CLI and platform engines in both production recipes, and install development tooling from the lockfile.
- [x] Run offline startup smoke tests against all affected image targets and rerun the full quality gates.
