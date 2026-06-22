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

### Requirement: Adding a CalDAV calendar is scoped to the selected account

Because a user can now have multiple CalDAV accounts, and CalDAV calendar URLs/hrefs are account-local server data, the add-calendar endpoint SHALL look up an existing feed scoped to the selected `accountId` (not just the user). Two CalDAV accounts that return the same calendar URL SHALL each get their own feed under their own account.

#### Scenario: Two accounts with the same calendar URL each get their own feed

- **WHEN** account A already has a CalDAV feed with URL `https://host/dav/cal/`
- **AND** the user adds the same-URL calendar for a different account B
- **THEN** the existing-feed lookup is scoped to account B (finds nothing)
- **AND** a new feed is created under account B rather than returning account A's feed

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

### Requirement: CalDAV server URLs are canonicalized (origin only) before use as an identity key

The stored CalDAV server URL SHALL have its origin canonicalized so trivial textual variants of the same endpoint do not bypass the duplicate guard and create duplicate accounts. Canonicalization SHALL lowercase the scheme and host and drop redundant default ports (443 for https, 80 for http). It SHALL preserve the path, query, and fragment byte-for-byte (no trailing-slash trimming, no case change), because `caldavUrl` is the exact endpoint later used for calendar listing and sync and CalDAV collection paths are slash- and case-sensitive. A value that is not a parseable URL SHALL be stored trimmed and otherwise unchanged.

#### Scenario: Host/scheme/port variant is treated as the same server

- **WHEN** a user connects `https://Server.example.com/dav` and later `https://server.example.com:443/dav`
- **THEN** both resolve to the same stored URL
- **AND** the second attempt is rejected as a duplicate rather than creating a second account

#### Scenario: A path-based collection URL is stored exactly as validated

- **WHEN** a user connects a path-based CalDAV URL such as `https://caldav.fastmail.com/dav/calendars/user/me/`
- **THEN** the stored URL preserves the path and its trailing slash exactly
- **AND** the endpoint later used for listing/sync is the same one that was validated

#### Scenario: A fragment does not create a distinct account

- **WHEN** a user connects `https://server.example.com/dav#a` and later `https://server.example.com/dav#b`
- **THEN** the fragment is dropped from the stored URL (it is never sent to the server)
- **AND** the second attempt is rejected as a duplicate rather than creating a second account

### Requirement: Existing CalDAV URLs are canonicalized by the migration

So that legacy rows (stored raw before this change) and post-upgrade reconnections share one identity, the migration SHALL canonicalize existing `caldavUrl` values to the same origin-only form the application now stores, before de-duplicating and creating the index.

#### Scenario: Legacy raw URL collides with a canonical reconnect

- **WHEN** a pre-upgrade account stored `https://Server.com` and the same user/server/username is reconnected after the upgrade (stored canonically as `https://server.com/`)
- **THEN** the migration canonicalizes the legacy value to `https://server.com/`
- **AND** the two are treated as the same account (de-duplicated) rather than left as duplicates

### Requirement: Connected CalDAV accounts are distinguishable in account management

Anywhere connected accounts are listed for management, CalDAV accounts that share a username SHALL be distinguishable by their server URL, so a user does not remove the wrong account. The accounts API SHALL include the CalDAV server URL and the settings UI SHALL display it for CalDAV accounts.

#### Scenario: Two same-username CalDAV accounts are shown distinctly

- **WHEN** a user has two CalDAV accounts with the same username on different servers
- **THEN** the accounts list includes each account's CalDAV server URL
- **AND** the settings UI shows the server URL for each CalDAV account so they are not identical cards

### Requirement: Tightening the uniqueness constraint is safe and non-destructive on existing data

The migration that introduces the wider `NULLS NOT DISTINCT` key SHALL NOT fail on databases that contain pre-existing rows which would collide under the new key (e.g. duplicate rows with a null `userId`, which the old `NULLS DISTINCT` index permitted). It SHALL de-duplicate such rows first, keeping the most recently updated row per key. It SHALL preserve calendar data: the calendar feeds (and their cascade-linked events) of a removed duplicate account are reassigned to the surviving account for that key rather than deleted. Only after de-duplication does it create the new index.

#### Scenario: Migration applies over legacy duplicate rows without losing calendar or task-sync data

- **WHEN** the database has two `ConnectedAccount` rows that are equal under `(userId, provider, email, caldavUrl)` with NULLs treated as equal, and the older one owns a calendar feed (with events) and a task-sync provider
- **THEN** the migration keeps the newest account and deletes the older duplicate
- **AND** the older account's calendar feed is reassigned to the surviving account (its events are preserved, not cascade-deleted)
- **AND** the older account's task provider is reassigned to the surviving account (not detached/`SET NULL`)
- **AND** the new unique index is created successfully
