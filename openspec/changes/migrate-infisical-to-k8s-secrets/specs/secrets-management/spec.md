## ADDED Requirements

### Requirement: Kubernetes Native Secrets Management
The system SHALL use Kubernetes-native secrets for environment variable injection, with Infisical serving as the source of truth during CI/CD.

#### Scenario: CI/CD Secret Export
- **WHEN** a GitHub Actions workflow runs for deployment
- **THEN** Infisical CLI SHALL be used to export secrets for the target environment
- **AND** the exported secrets SHALL be applied as a Kubernetes secret in the target namespace

#### Scenario: Pod Environment Injection
- **WHEN** a pod starts in the Kubernetes cluster
- **THEN** environment variables SHALL be injected directly from Kubernetes secrets
- **AND** no runtime dependency on Infisical service SHALL exist

#### Scenario: Local Development Secrets
- **WHEN** a developer needs to test Kubernetes deployments locally
- **THEN** they SHALL be able to generate a secrets.yaml file using Infisical CLI
- **AND** the generated file SHALL be git-ignored to prevent accidental commits

### Requirement: Simplified Container Images
The Docker images SHALL NOT include Infisical CLI or any secrets management tooling.

#### Scenario: Docker Image Build
- **WHEN** a Docker image is built for production
- **THEN** Infisical CLI SHALL NOT be installed in the image
- **AND** environment variables required at build time SHALL be provided directly by CI/CD

#### Scenario: Application Startup
- **WHEN** the application starts in a container
- **THEN** the start command SHALL directly invoke the application (e.g., `next start`)
- **AND** no wrapper script or CLI tool SHALL be required to inject secrets

### Requirement: Secrets File Protection
Local secrets files SHALL be protected from accidental git commits.

#### Scenario: Git Ignore Configuration
- **WHEN** a secrets.yaml file exists in the k8s directory
- **THEN** git SHALL ignore the file based on .gitignore patterns
- **AND** only example/template files SHALL be committed to the repository
