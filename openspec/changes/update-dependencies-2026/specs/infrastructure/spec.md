# Infrastructure Capability - Dependency Updates

## ADDED Requirements

### Requirement: Modern Framework Versions
The system SHALL use modern, actively maintained versions of core frameworks to ensure security patches and feature support.

#### Scenario: Next.js 16 compatibility
- **WHEN** the application is built
- **THEN** it SHALL compile successfully with Next.js 16.x
- **AND** use the `proxy.ts` pattern for network boundary handling
- **AND** properly await all async params and searchParams

#### Scenario: TailwindCSS v4 compatibility
- **WHEN** styles are compiled
- **THEN** the application SHALL use TailwindCSS v4.x CSS-first configuration
- **AND** maintain visual consistency with the existing design

#### Scenario: Prisma v7 compatibility
- **WHEN** database operations are performed
- **THEN** the system SHALL use Prisma v7.x with driver adapters
- **AND** support both PostgreSQL (production) and SQLite (development)

### Requirement: Security Vulnerability Remediation
The system SHALL maintain zero critical or high severity security vulnerabilities in its dependencies.

#### Scenario: Dependency audit passes
- **WHEN** `npm audit` is run
- **THEN** there SHALL be zero critical severity vulnerabilities
- **AND** there SHALL be zero high severity vulnerabilities
- **AND** any moderate or low vulnerabilities SHALL have documented exceptions or mitigations

### Requirement: State Management Compatibility
The system SHALL use modern state management patterns compatible with React 19.

#### Scenario: Zustand v5 store compatibility
- **WHEN** state stores are created
- **THEN** they SHALL use Zustand v5.x named imports
- **AND** properly handle equality functions using `createWithEqualityFn`

#### Scenario: Zod v4 schema validation
- **WHEN** data validation is performed
- **THEN** schemas SHALL use Zod v4.x APIs
- **AND** error handling SHALL use `.issues` instead of deprecated `.errors`

### Requirement: Payment Processing Compatibility
The system SHALL maintain compatibility with current Stripe API versions.

#### Scenario: Stripe SDK v20 webhook handling
- **WHEN** Stripe webhooks are received
- **THEN** the system SHALL process them using Stripe SDK v20.x
- **AND** use `V2.Core.Events` namespace for event types
- **AND** use `parseEventNotification` for thin event parsing

## MODIFIED Requirements

### Requirement: Browser Support
The system SHALL support modern browsers for the user interface.

#### Scenario: Minimum browser versions
- **WHEN** users access the application
- **THEN** the UI SHALL function correctly on Safari 16.4+
- **AND** Chrome 111+
- **AND** Firefox 128+
- **AND** Edge 111+

#### Scenario: Legacy browser handling
- **WHEN** users access the application from unsupported browsers
- **THEN** the system SHOULD display a message recommending browser upgrade
