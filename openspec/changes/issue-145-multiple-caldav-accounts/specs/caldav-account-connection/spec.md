## ADDED Requirements

### Requirement: CalDAV account identity is scoped by server URL

A connected CalDAV account SHALL be uniquely identified by `(user, provider, username, server URL)`, not by `(user, provider, username)` alone. A user SHALL be able to connect multiple CalDAV servers, including servers that share the same username, as long as the server URLs differ. The `ConnectedAccount` uniqueness constraint SHALL therefore cover `(userId, provider, email, caldavUrl)`.

#### Scenario: Same username on two different CalDAV servers

- **WHEN** a user has connected CalDAV server `https://server-a.example.com` with username `FOO`
- **AND** the user connects CalDAV server `https://server-b.example.com` with the same username `FOO`
- **THEN** the second account is created successfully
- **AND** both CalDAV accounts exist for the user

#### Scenario: Same server and username added twice is rejected with a clear message

- **WHEN** a user has already connected CalDAV server `https://server-a.example.com` with username `FOO`
- **AND** the user tries to connect the same server `https://server-a.example.com` with the same username `FOO` again
- **THEN** the request is rejected with a duplicate/conflict error
- **AND** the error message states that this CalDAV server is already connected, not that the credentials are incorrect

### Requirement: OAuth account identity stays scoped by email

The change to CalDAV identity SHALL NOT weaken uniqueness for OAuth providers. For `GOOGLE` and `OUTLOOK` accounts (where the CalDAV server URL is null), a user SHALL still be limited to one connected account per `(user, provider, email)`. This is achieved by treating null server URLs as equal (`NULLS NOT DISTINCT`) in the uniqueness constraint, so two OAuth rows with the same `(userId, provider, email)` still collide.

#### Scenario: Connecting the same Google account twice is still prevented

- **WHEN** a user has connected a Google account with email `user@gmail.com`
- **AND** the same Google account `user@gmail.com` is connected again
- **THEN** the existing account's tokens are updated in place
- **AND** no second `GOOGLE` `ConnectedAccount` row is created for that email

#### Scenario: OAuth token store does not depend on the renamed composite key

- **WHEN** the OAuth token-store logic persists tokens for a `(user, provider, email)`
- **THEN** it locates any existing account by `(userId, provider, email)` and updates it, otherwise creates a new one
- **AND** it does not rely on a Prisma named unique input that was removed by the constraint change
