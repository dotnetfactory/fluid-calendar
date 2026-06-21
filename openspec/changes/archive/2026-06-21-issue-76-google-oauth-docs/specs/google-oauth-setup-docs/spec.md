## ADDED Requirements

### Requirement: Both Google OAuth redirect URIs are documented

The Google Calendar setup instructions SHALL document both redirect URIs that a working FluidCalendar install requires in Google Cloud: the calendar-connect callback path `/api/calendar/google` and the Google sign-in callback path `/api/auth/callback/google`. This SHALL be true in both the README and the in-app System Settings instructions, so the two sources agree.

#### Scenario: README lists both redirect URIs

- **WHEN** a self-hoster reads the Google Calendar setup section of `README.md`
- **THEN** it lists `/api/calendar/google` as an authorized redirect URI
- **AND** it lists `/api/auth/callback/google` as an authorized redirect URI

#### Scenario: In-app instructions list both redirect URIs

- **WHEN** a self-hoster opens System Settings and reads the Google Calendar Integration instructions
- **THEN** the instructions reference the `/api/calendar/google` redirect URI
- **AND** the instructions reference the `/api/auth/callback/google` redirect URI

### Requirement: In-app redirect URIs use the deployment's own origin

The in-app System Settings instructions SHALL build each documented Google redirect URI from the running deployment's origin (`window.location.origin`) rather than a hardcoded host, so the displayed URIs match the URL the operator is actually using.

#### Scenario: Displayed URIs are origin-relative

- **WHEN** the System Settings Google Calendar Integration instructions render
- **THEN** each documented redirect URI is composed from `window.location.origin`
- **AND** no Google redirect URI is hardcoded to a fixed host such as `http://localhost:3000`

### Requirement: Setup docs explain the common connection failures

The Google Calendar setup documentation SHALL include troubleshooting guidance for the two most common connection failures: (a) the OAuth redirect host is derived from `NEXTAUTH_URL`, which must equal the public URL the browser uses, and (b) Google rejects bare private IP addresses and `.local` hostnames as redirect URIs, so `localhost` (for local dev) or a public domain must be used.

#### Scenario: NEXTAUTH_URL guidance is present

- **WHEN** a self-hoster reads the Google Calendar setup guidance in `README.md`
- **THEN** it states that `NEXTAUTH_URL` must match the public URL used to reach the app
- **AND** it indicates that `NEXTAUTH_URL` (not `NEXT_PUBLIC_APP_URL`) drives the OAuth redirect host

#### Scenario: Private-IP limitation is documented

- **WHEN** a self-hoster reads the Google Calendar setup guidance in `README.md`
- **THEN** it warns that Google does not accept bare private IP addresses or `.local` hostnames as redirect URIs
- **AND** it advises using `localhost` for local development or a public domain otherwise
