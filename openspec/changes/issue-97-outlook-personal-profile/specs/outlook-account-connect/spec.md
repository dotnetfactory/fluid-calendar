## ADDED Requirements

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

### Requirement: Outlook setup docs list the correct redirect URI

The Outlook setup documentation SHALL instruct self-hosters to register the redirect URI `/api/calendar/outlook`, which is the path the Outlook connect callback actually uses, and SHALL NOT instruct registering `/api/auth/callback/azure-ad` or a `/api/calendar/outlook/callback` variant for Outlook calendar connect.

#### Scenario: README lists the correct redirect URI

- **WHEN** a self-hoster reads the Microsoft Outlook Setup section of `README.md`
- **THEN** it lists `/api/calendar/outlook` as the redirect URI to register
- **AND** it does not instruct registering `/api/auth/callback/azure-ad` for Outlook calendar connect

#### Scenario: Reference doc lists the correct redirect URI

- **WHEN** a self-hoster reads the redirect URI guidance in `docs/_old/outlook.md`
- **THEN** the documented Outlook redirect URI ends with `/api/calendar/outlook` (no trailing `/callback`)
