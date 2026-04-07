## ADDED Requirements

### Requirement: Open-Core Repository Architecture
The project SHALL use a single public repository with an optional private Git submodule for proprietary SaaS features, enabling both open-source and commercial deployment modes.

#### Scenario: Open-source clone works standalone
- **WHEN** a user runs `git clone https://github.com/dotnetfactory/fluid-calendar`
- **THEN** the repository SHALL contain a complete, working open-source application
- **AND** no SaaS code or proprietary features SHALL be present
- **AND** `npm install && npm run build` SHALL succeed

#### Scenario: Full SaaS clone includes proprietary features
- **WHEN** a user with submodule access runs `git clone --recurse-submodules`
- **THEN** the `saas/` directory SHALL be populated with proprietary code
- **AND** the setup script SHALL integrate SaaS features into the build
- **AND** all SaaS features (subscriptions, pSEO, admin) SHALL be available

### Requirement: Private SaaS Submodule Structure
The SaaS submodule SHALL contain all proprietary code organized in a structure that mirrors the main application.

#### Scenario: Submodule contains SaaS routes
- **GIVEN** the saas/ submodule is present
- **WHEN** examining the submodule contents
- **THEN** `saas/app/(saas)/` SHALL contain all SaaS route pages
- **AND** `saas/api/` SHALL contain all SaaS API routes
- **AND** `saas/components/` SHALL contain SaaS-specific components
- **AND** `saas/lib/` SHALL contain SaaS services and utilities

#### Scenario: Submodule contains infrastructure code
- **GIVEN** the saas/ submodule is present
- **WHEN** examining the submodule contents
- **THEN** `saas/jobs/` SHALL contain BullMQ background workers
- **AND** `saas/k8s/` SHALL contain Kubernetes deployment configurations
- **AND** `saas/.github/workflows/` SHALL contain deployment workflows

### Requirement: Build-Time Feature Integration
The build system SHALL detect the presence of the SaaS submodule and conditionally integrate its features at build time.

#### Scenario: Setup script integrates submodule
- **GIVEN** the saas/ submodule is populated
- **WHEN** `npm install` runs the postinstall hook
- **THEN** the setup script SHALL create symlinks for SaaS routes
- **AND** the setup script SHALL merge SaaS dependencies into package.json
- **AND** the setup script SHALL merge Prisma schemas

#### Scenario: Next.js detects SaaS presence
- **GIVEN** the saas/ submodule routes are symlinked
- **WHEN** Next.js builds the application
- **THEN** SaaS routes SHALL be included in the build
- **AND** the `NEXT_PUBLIC_HAS_SAAS` environment variable SHALL be set to 'true'

#### Scenario: Build without submodule excludes SaaS
- **GIVEN** the saas/ submodule is NOT present
- **WHEN** Next.js builds the application
- **THEN** no SaaS routes SHALL be included
- **AND** the `NEXT_PUBLIC_HAS_SAAS` environment variable SHALL be set to 'false'
- **AND** the build SHALL succeed with core features only

### Requirement: Split Prisma Schema
The database schema SHALL be split between core models (public) and SaaS models (private submodule).

#### Scenario: Core schema contains base models
- **GIVEN** the public repository
- **WHEN** examining `prisma/schema.prisma`
- **THEN** it SHALL contain User, Task, Project, CalendarEvent, and other core models
- **AND** it SHALL NOT contain Subscription, Waitlist, Article, or other SaaS models

#### Scenario: SaaS schema extends core
- **GIVEN** the saas/ submodule is present
- **WHEN** the setup script runs
- **THEN** `saas/prisma/schema.saas.prisma` SHALL be merged with the core schema
- **AND** the merged schema SHALL contain all models for full functionality

### Requirement: Dependency Separation
Core dependencies SHALL be in the main package.json, while SaaS-only dependencies SHALL be in the submodule.

#### Scenario: Core package.json is minimal
- **GIVEN** the public repository
- **WHEN** examining package.json
- **THEN** it SHALL NOT contain `bullmq`, `ioredis`, `stripe`, or `resend`
- **AND** it SHALL contain all dependencies needed for core functionality

#### Scenario: SaaS dependencies merged when present
- **GIVEN** the saas/ submodule is present
- **WHEN** the setup script runs
- **THEN** dependencies from `saas/package.json` SHALL be merged into the main package.json
- **AND** `npm install` SHALL install all merged dependencies

### Requirement: Sensitive Data Exclusion
Neither the public repository nor the submodule SHALL contain hardcoded credentials or secrets.

#### Scenario: Public repo contains no secrets
- **GIVEN** the public repository
- **WHEN** scanning all files
- **THEN** no API keys, tokens, or credentials SHALL be present
- **AND** `.env.example` SHALL document required variables with placeholder values

#### Scenario: Submodule uses parameterized configs
- **GIVEN** the saas/ submodule
- **WHEN** examining deployment configurations
- **THEN** all infrastructure values SHALL use `${{ secrets.* }}` or environment variables
- **AND** no hardcoded domains, registry URLs, or cluster names SHALL be present

## REMOVED Requirements

### Requirement: Dual Repository Synchronization
**Reason**: Replaced by Git submodule architecture. The submodule approach provides cleaner separation without manual sync scripts.

**Migration**:
- Delete `scripts/sync-repos.sh`, `sync-repos-reverse.sh`, `sync-issues.sh`
- Delete `.github/workflows/sync-os-issues.yml`
- Archive the separate open-source repository

### Requirement: Build-Time File Extension Switching
**Reason**: The `.saas.` and `.open.` file extension pattern is replaced by submodule-based separation.

**Migration**:
- Move `.saas.` files to the submodule
- Merge `.open.` files into core as default implementations
- Remove extension-based logic from `next.config.ts`
