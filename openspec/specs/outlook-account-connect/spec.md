# outlook-account-connect Specification

## Purpose
TBD - created by archiving change issue-97-outlook-personal-profile. Update Purpose after archive.
## Requirements
### Requirement: Outlook connect resolves the account email from mail or userPrincipalName

When connecting a Microsoft (Outlook) account, FluidCalendar SHALL determine the account's email address from the Microsoft Graph `/me` profile by using the `mail` field when present and falling back to `userPrincipalName` when `mail` is absent. The connection SHALL be treated as a profile failure only when neither field yields an email.

#### Scenario: Work or school account with mail set

- **WHEN** the Graph `/me` profile has a non-empty `mail` field
- **THEN** the account is stored keyed by the `mail` value
- **AND** the connection succeeds (no `profile-fetch-failed` redirect)

#### Scenario: Personal account with mail null

- **WHEN** the Graph `/me` profile has `mail` null or empty but a non-empty `userPrincipalName`
- **THEN** the account is stored keyed by the `userPrincipalName` value
- **AND** the connection succeeds (no `profile-fetch-failed` redirect)

#### Scenario: Neither identifier present

- **WHEN** the Graph `/me` profile has neither a usable `mail` nor `userPrincipalName`
- **THEN** the connection fails with the `profile-fetch-failed` outcome
- **AND** no account is stored

### Requirement: Outlook is considered configured without a tenant ID

FluidCalendar SHALL treat Outlook integration as configured when an Outlook client ID and client secret are present, regardless of whether a tenant ID is set. The tenant ID is optional (the OAuth flow defaults to the `common` tenant), so requiring it would disable the in-app "Connect Outlook" action for the documented personal-account setup.

The configured status SHALL be computed from the same merged credential source the OAuth routes use (system settings OR the documented `AZURE_AD_*` environment-variable fallback), so the status reflects whether the connect flow can actually run.

#### Scenario: Configured with client id and secret but no tenant id

- **WHEN** the integration status is computed and the Outlook client ID and client secret are set but no tenant ID is configured
- **THEN** Outlook is reported as configured
- **AND** the in-app "Connect Outlook" action is enabled

#### Scenario: Configured via the environment-variable fallback

- **WHEN** Outlook credentials are provided only through the `AZURE_AD_*` environment variables (no system-settings row)
- **THEN** Outlook is reported as configured

#### Scenario: Not configured when client id or secret is missing

- **WHEN** the Outlook client ID or client secret is missing from both settings and the environment
- **THEN** Outlook is reported as not configured

### Requirement: Outlook setup docs list the correct redirect URI

The Outlook setup documentation SHALL instruct self-hosters to register the redirect URI `/api/calendar/outlook`, which is the path the Outlook connect callback actually uses, and SHALL NOT instruct registering `/api/auth/callback/azure-ad` or a `/api/calendar/outlook/callback` variant for Outlook calendar connect.

#### Scenario: README lists the correct redirect URI

- **WHEN** a self-hoster reads the Microsoft Outlook Setup section of `README.md`
- **THEN** it lists `/api/calendar/outlook` as the redirect URI to register
- **AND** it does not instruct registering `/api/auth/callback/azure-ad` for Outlook calendar connect

#### Scenario: Reference doc lists the correct redirect URI

- **WHEN** a self-hoster reads the redirect URI guidance in `docs/_old/outlook.md`
- **THEN** the documented Outlook redirect URI ends with `/api/calendar/outlook` (no trailing `/callback`)

