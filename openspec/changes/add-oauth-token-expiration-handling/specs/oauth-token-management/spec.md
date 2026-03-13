# OAuth Token Management

## ADDED Requirements

### Requirement: Auth Status Tracking

The system SHALL track authentication status for each connected calendar account with the following states:
- `valid` - Account is authenticated and tokens are working
- `needs_reauth` - Tokens have been revoked or permanently expired, user action required
- `error` - Temporary error occurred, will retry automatically

The system SHALL store the error message and timestamp when an account enters a non-valid state.

#### Scenario: Account marked as needs_reauth on invalid_grant

- **GIVEN** a user has a connected Google Calendar account
- **WHEN** the system attempts to refresh the OAuth token
- **AND** Google returns an `invalid_grant` error
- **THEN** the account's authStatus SHALL be set to `needs_reauth`
- **AND** the authError SHALL contain a user-friendly message
- **AND** the authErrorAt SHALL be set to the current timestamp

#### Scenario: Account status reset on successful reconnection

- **GIVEN** a user has an account with authStatus `needs_reauth`
- **WHEN** the user completes the OAuth flow to reconnect the account
- **THEN** the account's authStatus SHALL be set to `valid`
- **AND** the authError SHALL be cleared
- **AND** the authErrorAt SHALL be cleared

### Requirement: Error Classification

The system SHALL classify OAuth token refresh errors into two categories:
- **Permanent errors** requiring user re-authentication: `invalid_grant`, token revocation, AADSTS50173, AADSTS700082, AADSTS50078
- **Temporary errors** that may resolve on retry: network timeouts, server errors (500, 503)

Only permanent errors SHALL update the account's authStatus to `needs_reauth`.

#### Scenario: Temporary error does not change auth status

- **GIVEN** a user has a connected account with authStatus `valid`
- **WHEN** a token refresh fails due to a network timeout
- **THEN** the account's authStatus SHALL remain `valid`
- **AND** the sync operation SHALL be retried according to normal retry policy

#### Scenario: Permanent error changes auth status

- **GIVEN** a user has a connected Outlook account with authStatus `valid`
- **WHEN** Microsoft returns AADSTS700082 (refresh token expired)
- **THEN** the account's authStatus SHALL be set to `needs_reauth`

### Requirement: Structured API Error Response

Calendar sync API endpoints SHALL return a structured error response when authentication fails, including:
- `error`: Human-readable error message
- `code`: Error code `AUTH_REQUIRED`
- `accountId`: The affected account ID
- `message`: Actionable guidance for the user

#### Scenario: Google sync returns AUTH_REQUIRED on auth failure

- **GIVEN** a user triggers calendar sync
- **WHEN** the Google Calendar API returns a 401 or invalid_grant error
- **THEN** the API SHALL return HTTP 401
- **AND** the response body SHALL include `code: "AUTH_REQUIRED"`
- **AND** the response body SHALL include the affected `accountId`

### Requirement: UI Auth Status Display

The settings UI SHALL display authentication status for connected accounts:
- Accounts with `needs_reauth` status SHALL display a warning indicator
- A "Reconnect" button SHALL be available to initiate re-authentication
- The error message SHALL be displayed to explain what happened

#### Scenario: User sees warning for account needing reauth

- **GIVEN** a user has a connected account with authStatus `needs_reauth`
- **WHEN** the user views the Settings > Accounts section
- **THEN** the account SHALL display a warning badge indicating "Needs Reconnection"
- **AND** the stored error message SHALL be displayed
- **AND** a "Reconnect" button SHALL be available

#### Scenario: User reconnects account via UI

- **GIVEN** a user sees an account with a "Needs Reconnection" warning
- **WHEN** the user clicks the "Reconnect" button
- **THEN** the system SHALL initiate the OAuth flow for that provider
- **AND** upon successful completion, the warning SHALL be removed

### Requirement: Proactive Token Health Check

The system SHALL run a background job to proactively check token health:
- The job SHALL run every 6 hours
- The job SHALL check accounts with tokens expiring within 1 hour
- The job SHALL attempt to refresh expiring tokens
- Failed refreshes due to permanent errors SHALL update the account's authStatus

#### Scenario: Health check refreshes expiring token

- **GIVEN** a connected account has a token expiring in 30 minutes
- **WHEN** the token health check job runs
- **THEN** the system SHALL attempt to refresh the token
- **AND** if successful, the new token SHALL be stored

#### Scenario: Health check marks account needing reauth

- **GIVEN** a connected account has an expired refresh token
- **WHEN** the token health check job runs
- **AND** the refresh attempt returns invalid_grant
- **THEN** the account's authStatus SHALL be set to `needs_reauth`
- **AND** the error SHALL be logged with structured metadata
