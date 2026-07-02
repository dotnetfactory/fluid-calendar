## Why

A self-hoster cannot connect a second CalDAV server when the username is the same as one already connected (issue #145). Adding the second server fails with a misleading "Incorrect credentials" message; the server log shows the real cause:

```
Invalid prisma.connectedAccount.create() invocation:
Unique constraint failed on the fields: (userId,provider,email)
```

Root cause: `ConnectedAccount` has `@@unique([userId, provider, email])` (`prisma/schema.prisma`), and the CalDAV auth route stores the connection with `email: username` (`src/app/api/calendar/caldav/auth/route.ts`). For OAuth providers (Google/Outlook) `email` is a real, globally-unique mailbox, so this constraint is correct - it prevents connecting the same Google account twice. But for CalDAV the "email" is just the login username (e.g. `FOO`, `admin`, or a shared address), which is **not** unique across servers. Two distinct CalDAV servers that happen to use the same username collide on this constraint, so the second `create()` is rejected. The user is told the credentials are wrong even though they are correct - the server URL differs but is not part of the uniqueness key.

The correct identity of a CalDAV account is `(user, username, server URL)`, not `(user, username)`. OAuth identity stays `(user, email)`.

## What Changes

- Make CalDAV account uniqueness include the server URL. The `ConnectedAccount` unique constraint becomes `(userId, provider, email, caldavUrl)`, with `NULLS NOT DISTINCT` semantics so that:
  - For OAuth providers (`caldavUrl` is always `NULL`), uniqueness is unchanged - `(userId, provider, email)` still collides as before (no second Google/Outlook account with the same email).
  - For CalDAV, the same username on two different `caldavUrl`s no longer collides, so multiple CalDAV servers can be connected.
- Decouple the OAuth token-store upsert from the named composite unique key it currently relies on (`userId_provider_email`), since that named key changes shape. `TokenManager.storeTokens` (Google/Outlook only) is rewritten to upsert by `(userId, provider, email)` via a `findFirst` + update-or-create, preserving its exact current behavior (one OAuth account per email).
- The CalDAV auth route still surfaces a clear message if you try to add the **same** server with the same username twice (a genuine duplicate), instead of a generic "credentials" error.
- Database migration to replace the unique index, using Postgres 16 `NULLS NOT DISTINCT`.

This is a core (open-source) bug fix. CalDAV is a self-hosted feature, so the fix belongs in the shared codebase. It includes a small UI addition (showing the CalDAV server URL in account management so same-username accounts are distinguishable).

Note: the `NULLS NOT DISTINCT` unique index requires PostgreSQL 15+ (the bundled docker-compose uses 16). The migration fails fast with a clear message on older servers and the README documents the requirement.

## Capabilities

### New Capabilities

- `caldav-account-connection`: Connecting one or more CalDAV servers as `ConnectedAccount`s, including the rule that account identity for CalDAV is scoped by server URL so multiple servers can be connected (even with the same username), while OAuth account identity stays scoped by email.

### Modified Capabilities

<!-- None: no existing spec covers CalDAV account connection / ConnectedAccount uniqueness. -->

## Impact

- `prisma/schema.prisma` (`ConnectedAccount` unique constraint: `(userId, provider, email)` -> `(userId, provider, email, caldavUrl)`, `NULLS NOT DISTINCT`).
- New Prisma migration replacing the unique index.
- `src/lib/token-manager.ts` (`storeTokens` no longer uses the `userId_provider_email` upsert input).
- `src/app/api/calendar/caldav/auth/route.ts` (clear duplicate-server message; uniqueness now allows different URLs).
- `CHANGELOG.md` (`[unreleased]` entry).
- No change to the accounts list/delete routes, OAuth connect flows' observable behavior, or the calendar UI.
