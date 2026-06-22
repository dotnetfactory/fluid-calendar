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
- **AND** if a concurrent first-time callback creates the row first, the unique-constraint error is caught and the existing row is updated instead (idempotent)

### Requirement: CalDAV server URLs are canonicalized before use as an identity key

The stored CalDAV server URL SHALL be canonicalized so trivial textual variants of the same endpoint do not bypass the duplicate guard and create duplicate accounts. Canonicalization SHALL lowercase the scheme and host, drop default ports (443/https, 80/http), and remove a single trailing slash, while preserving the (case-sensitive) path otherwise. A value that is not a parseable URL SHALL be stored trimmed and otherwise unchanged.

#### Scenario: Trailing-slash variant is treated as the same server

- **WHEN** a user connects `https://server.example.com/` and later `https://server.example.com`
- **THEN** both resolve to the same stored URL
- **AND** the second attempt is rejected as a duplicate rather than creating a second account

### Requirement: Connected CalDAV accounts are distinguishable in account management

Anywhere connected accounts are listed for management, CalDAV accounts that share a username SHALL be distinguishable by their server URL, so a user does not remove the wrong account. The accounts API SHALL include the CalDAV server URL and the settings UI SHALL display it for CalDAV accounts.

#### Scenario: Two same-username CalDAV accounts are shown distinctly

- **WHEN** a user has two CalDAV accounts with the same username on different servers
- **THEN** the accounts list includes each account's CalDAV server URL
- **AND** the settings UI shows the server URL for each CalDAV account so they are not identical cards

### Requirement: Tightening the uniqueness constraint is safe on existing data

The migration that introduces the wider `NULLS NOT DISTINCT` key SHALL NOT fail on databases that contain pre-existing rows which would collide under the new key (e.g. duplicate rows with a null `userId`, which the old `NULLS DISTINCT` index permitted). It SHALL de-duplicate such rows first, keeping the most recently updated row per key and removing the dependent calendar feeds of the rows it deletes, then create the new index.

#### Scenario: Migration applies over legacy duplicate rows

- **WHEN** the database has two `ConnectedAccount` rows that are equal under `(userId, provider, email, caldavUrl)` with NULLs treated as equal
- **THEN** the migration deletes the older duplicate (and its calendar feeds) and keeps the newest
- **AND** the new unique index is created successfully
