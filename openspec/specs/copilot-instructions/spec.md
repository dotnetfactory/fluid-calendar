# copilot-instructions Specification

## Purpose
TBD - created by archiving change issue-147-copilot-instructions. Update Purpose after archive.
## Requirements
### Requirement: Copilot custom-instructions file exists at the GitHub-recognized path

The repository SHALL provide a Copilot custom-instructions file at
`.github/copilot-instructions.md` so that GitHub Copilot's coding agent
automatically picks up repository-wide guidance.

#### Scenario: File present at the canonical path

- **WHEN** the repository is checked out
- **THEN** a non-empty Markdown file exists at `.github/copilot-instructions.md`

### Requirement: Instructions describe setup and the verification gate

The instructions file SHALL document how to install dependencies and run the
project's build, dev, test, lint, and type-check commands, and SHALL state the
gate a contribution must pass before review.

#### Scenario: Install and commands documented

- **WHEN** a reader needs to set up and verify the project
- **THEN** the file states that dependencies install with `npm install --legacy-peer-deps`
- **AND** it references the `dev`, `build`, `test:unit`, `lint`, and `type-check` npm scripts
- **AND** it states that lint must pass with zero warnings

### Requirement: Instructions capture the SAAS vs open-source separation

The instructions file SHALL describe the open-source vs SAAS dual-build model so
Copilot does not leak SAAS-only code into the public build.

#### Scenario: Dual-build rules documented

- **WHEN** Copilot is asked to add or modify a feature
- **THEN** the file explains that SAAS-only code lives under `src/saas/`
- **AND** it explains the `*.saas.ts(x)` / `*.open.ts(x)` file-extension convention
- **AND** it notes that `.gitignore` must not be used to hide SAAS files

### Requirement: Instructions capture core code-style conventions

The instructions file SHALL list the project's load-bearing code-style
conventions so Copilot-authored code matches the existing codebase.

#### Scenario: Conventions documented

- **WHEN** Copilot writes code for this repository
- **THEN** the file states to import the `prisma` singleton from `@/lib/prisma`
- **AND** it states to use date helpers from `@/lib/date-utils`
- **AND** it states to use the `logger` from `@/lib/logger` with a `LOG_SOURCE` instead of `console.log`
- **AND** it states that user-facing changes update `CHANGELOG.md`

### Requirement: Instructions stay consistent with existing project guidance

The instructions file SHALL be grounded in the repository's existing guidance
(`CLAUDE.md` and `openspec/project.md`) and SHALL NOT contradict it.

#### Scenario: No contradiction with CLAUDE.md

- **WHEN** the instructions file is compared against `CLAUDE.md` and `openspec/project.md`
- **THEN** the commands, paths, and conventions it states match those documents

