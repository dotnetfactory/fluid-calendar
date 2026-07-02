## Context

`ConnectedAccount` is the single table backing all three calendar providers (Google, Outlook, CalDAV). Its current identity key is `@@unique([userId, provider, email])`. For OAuth providers the `email` column holds the real mailbox returned by the provider and is the right uniqueness boundary. For CalDAV the route stores `email: username` and the real distinguishing attribute - the server URL - lives in `caldavUrl`, which is not part of the key. Hence two CalDAV servers sharing a username collide.

Constraints that shaped the design:

- The named composite key `userId_provider_email` is referenced in exactly one place: `TokenManager.storeTokens` (`src/lib/token-manager.ts`), an `upsert` used **only** by the Google and Outlook connect routes. CalDAV creates its account directly and never calls `storeTokens`. All other `ConnectedAccount` reads/writes (accounts list/delete, token refresh, sync) key off `id`.
- Postgres 16 is the target DB (`docker-compose.yml` uses `postgres:16-alpine`), which supports `NULLS NOT DISTINCT` on unique indexes.
- For OAuth rows, `caldavUrl IS NULL`. With the default Postgres rule (NULLs distinct), adding `caldavUrl` to the unique key would silently *remove* OAuth uniqueness (every NULL is "different"), letting the same Google account be connected twice. `NULLS NOT DISTINCT` prevents that.

## Goals / Non-Goals

Goals:
- Allow a user to connect multiple CalDAV servers, including with the same username, as long as the server URL differs.
- Preserve OAuth behavior exactly: still one Google/Outlook account per `(user, email)`.
- Keep duplicate protection for CalDAV: the *same* server + same username can't be added twice.

Non-Goals:
- No UI change (the CalDAV connect form already takes a server URL).
- No change to how CalDAV calendars/events sync.
- No multi-account model rework beyond the uniqueness key.

## Decisions

### Decision: uniqueness key becomes `(userId, provider, email, caldavUrl)` with `NULLS NOT DISTINCT`

The CalDAV auth route stores the resolved full URL in `caldavUrl` (`fullUrl`, which is the server URL plus any verified path). Including `caldavUrl` in the key makes two CalDAV servers with the same username distinct, while `NULLS NOT DISTINCT` keeps OAuth rows (where `caldavUrl IS NULL`) colliding on `(userId, provider, email)` exactly as today.

Expressed in Prisma as:

```prisma
@@unique([userId, provider, email, caldavUrl], name: "userId_provider_email_caldavUrl")
```

If Prisma 6.3's `@@unique` supports the `nullsNotDistinct` option, set it there; otherwise the generated migration's `CREATE UNIQUE INDEX` is hand-edited to add `NULLS NOT DISTINCT` (the column set Prisma manages is unchanged; only the NULL-handling clause is added). Either way the runtime index is `UNIQUE (...) NULLS NOT DISTINCT`.

Alternatives considered:
- **Partial unique indexes** (one `WHERE provider <> 'CALDAV'` on `(userId,provider,email)`, one on `(userId,provider,email,caldavUrl)` for CalDAV). Works, but Prisma cannot model partial indexes in the schema, so the schema and DB drift and `prisma migrate` would fight it. Rejected for maintainability.
- **A separate `caldavServerUrl`-only constraint**: doesn't protect against the same user adding the identical server+username twice as cleanly, and still needs the OAuth key untouched. The single `NULLS NOT DISTINCT` key is simpler.

### Decision: rewrite `storeTokens` off the named composite key

`storeTokens` currently does `upsert({ where: { userId_provider_email: {...} }, ... })`. Renaming/reshaping the key would break that input. Since `storeTokens` is OAuth-only and the semantic it needs is "one account per `(userId, provider, email)`", rewrite it as a `findFirst({ where: { userId, provider, email } })` then `update` (by `id`) or `create`. This preserves the exact current behavior without depending on a named composite unique input, and is robust to the key shape change. The tiny TOCTOU window is acceptable (same user re-connecting the same OAuth account concurrently is not a real scenario, and the worst case is a duplicate-key error surfaced to the caller, same as before).

### Decision: friendlier duplicate-server error in the CalDAV auth route

When the same server URL + username is added twice, the `create()` still throws `P2002`. The route catches Prisma `P2002` and returns a clear 409 "This CalDAV server is already connected for this account" instead of the generic 500 "check your credentials". This is the only behavior the user should still be blocked on, and the message now tells the truth.

## Risks / Trade-offs

- **Migration on existing data**: dropping and recreating the unique index is safe because no existing row violates the new (wider, NULLS-NOT-DISTINCT) key - it is strictly more permissive for CalDAV and identical for OAuth. The migration drops the old index then creates the new one.
- **`nullsNotDistinct` Prisma support uncertainty**: mitigated by verifying `prisma generate`/`migrate diff` accepts it; if not, the migration SQL is authored directly (validated by `prisma migrate diff`/`db execute` against a scratch DB is out of scope for the unit gate, so correctness is argued from the SQL + covered by a route-level test of the create path).

## Migration Plan

1. Edit `prisma/schema.prisma`: replace `@@unique([userId, provider, email])` with the 4-column key.
2. Hand-author a migration that `CREATE`s the new `UNIQUE ... NULLS NOT DISTINCT` index **before** `DROP`ing the old `ConnectedAccount_userId_provider_email_key`, so the table is never without a uniqueness guard even if the migration is interrupted (Prisma also wraps each migration in a transaction, making this belt-and-suspenders). Adding `caldavUrl` to the key only makes rows more distinct, so no legacy row can fail the new index.
3. `storeTokens` no longer references the old named key and stays atomic (P2002 retry).

Verified end-to-end against a disposable Postgres 16: full migration history applies, the resulting index carries `NULLS NOT DISTINCT`, the old index is gone, and `prisma migrate diff --from-migrations ... --to-schema` reports **no drift**.

## Codex review resolutions

- **Migration could drop the old guard before the new one exists** (high): resolved by reordering to CREATE-then-DROP (above).
- **Schema encodes weaker uniqueness than the migration** (high): Prisma 6.3's `@@unique` DSL cannot express `nullsNotDistinct`, so `prisma migrate diff --from-empty` / `prisma db push` emit the index *without* `NULLS NOT DISTINCT`. This repo provisions exclusively via `prisma migrate deploy` (see `package.json` `prisma:update`), which applies the hand-written migration with the correct semantics; `db push` is not used. We mitigate the latent footgun three ways: (a) an explicit `schema.prisma` comment forbidding `db push` for this model, (b) a guard unit test that fails if the migration ever loses `NULLS NOT DISTINCT` or the expected columns, and (c) `storeTokens` is defensive (idempotent upsert that converges even if a row was duplicated). Fully closing this in the schema would require upgrading Prisma to a version whose DSL supports `nullsNotDistinct`, which is out of scope for this fix.

## Open Questions

- None. The server-URL-as-identity boundary for CalDAV is the standard model and matches how the connect form already collects the server URL.
