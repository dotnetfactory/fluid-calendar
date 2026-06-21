## Why

GitHub issue #147 asks us to set up Copilot coding agent instructions for this
repository ("Configure instructions for this repository as documented in Best
practices for Copilot coding agent... Onboard this repo"). The repo has no
`.github/copilot-instructions.md`, so GitHub Copilot's coding agent (and Copilot
chat/code review) operate without any project-specific guidance and miss our
critical conventions - notably the open-source vs SAAS separation, the date/logging/
Prisma singleton rules, and the install/build/test commands. Codifying these in the
file GitHub looks for lets Copilot follow the same standards human and other AI
contributors already follow.

## What Changes

- Add a `.github/copilot-instructions.md` repository-wide custom instructions file
  for GitHub Copilot's coding agent, grounded in the existing `CLAUDE.md` and
  `openspec/project.md` so the two stay consistent.
- Cover: a short project overview; install (`npm install --legacy-peer-deps`) and the
  core build/dev/test/lint/type-check commands; the high-level architecture
  (local-first calendar sync, scheduling engine, task sync, background jobs); the
  SAAS-vs-open-source separation rules (the most error-prone area); the code-style
  conventions (Prisma singleton, date helpers, logger + `LOG_SOURCE`, Next 15 async
  `params`, admin middleware, JSX escaping, no em dashes); and the expectation that
  the PR gate (type-check + zero-warning lint + unit tests) is green and user-facing
  changes update `CHANGELOG.md`.
- No application code, schema, or build configuration changes.

## Capabilities

### New Capabilities

- `copilot-instructions`: Repository custom-instructions file that tells GitHub
  Copilot's coding agent how to build, test, and contribute to this codebase while
  respecting the SAAS/open-source split and the project's code-style conventions.

### Modified Capabilities

<!-- None - no existing spec requirements change. -->

## Impact

- New file: `.github/copilot-instructions.md` (documentation only).
- Consumers: GitHub Copilot coding agent / Copilot chat / Copilot code review in this
  repo. No effect on the application, CI, or runtime.
- Source of truth it must mirror: `CLAUDE.md`, `openspec/project.md`.
