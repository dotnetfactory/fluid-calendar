## ADDED Requirements

### Requirement: Successful preparation before application startup

The container entrypoint SHALL start the requested application only after database readiness, Prisma client generation, and migration deployment succeed. It SHALL propagate a failed Prisma command's exit status without running later startup stages.

#### Scenario: Prisma generation fails

- **WHEN** Prisma generation exits nonzero
- **THEN** the entrypoint exits with that status and runs neither migrations nor the application

#### Scenario: Prisma migration fails

- **WHEN** migration deployment exits nonzero
- **THEN** the entrypoint exits with that status without starting the application

#### Scenario: Preparation succeeds

- **WHEN** readiness polling eventually succeeds and both Prisma commands succeed
- **THEN** the entrypoint executes the application with its original arguments and preserves its exit status

### Requirement: Offline startup tooling

Every image using this entrypoint SHALL contain the lockfile's Prisma CLI, matching client, and platform engines. Startup SHALL invoke the bundled CLI without resolving or downloading packages or engines from a registry or CDN.

#### Scenario: Healthy database without internet access

- **WHEN** the container can reach PostgreSQL but cannot reach the internet
- **THEN** generation and migrations complete using the bundled tooling and the application starts
