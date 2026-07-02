## 1. Tests (red first)

- [x] 1.1 Add a unit test for `TokenManager.storeTokens` (Google/Outlook): updates the existing account in place for a repeated `(userId, provider, email)` and creates a new one otherwise, without using the `userId_provider_email` named input. (`src/lib/__tests__/token-manager-store.test.ts`)
- [x] 1.2 Add a unit test for the CalDAV auth route's duplicate handling: a Prisma `P2002` from `connectedAccount.create()` maps to a 409 with a "server already connected" message (not the generic "check your credentials" 500). (`src/__tests__/caldav-auth-duplicate.test.ts`)

## 2. Schema + migration

- [x] 2.1 Change `ConnectedAccount` in `prisma/schema.prisma`: replace `@@unique([userId, provider, email])` with a 4-column unique key over `(userId, provider, email, caldavUrl)`. (`nullsNotDistinct` is not expressible in Prisma 6.3's `@@unique` DSL, so the NULLS-NOT-DISTINCT semantics live in the migration SQL; `prisma migrate diff` confirms no drift between schema and the migrated DB.)
- [x] 2.2 Add a Prisma migration that drops the old `ConnectedAccount_userId_provider_email_key` index and creates the new `UNIQUE (...) NULLS NOT DISTINCT` index. Verified by applying the full migration history to a disposable Postgres 16 and checking the resulting index definition + drift. (`prisma/migrations/20260622130000_caldav_account_unique_by_server_url`)

## 3. Code

- [x] 3.1 Rewrite `TokenManager.storeTokens` to find the existing OAuth account by `(userId, provider, email)` (`findFirst`) and `update` by `id`, else `create` - no dependency on the named composite key. Kept idempotent under concurrent first-time callbacks: a `P2002` from the `create` re-reads and updates the row the winner inserted (atomicity equivalent to the prior `upsert`). (`src/lib/token-manager.ts`)
- [x] 3.2 In `src/app/api/calendar/caldav/auth/route.ts`, catch Prisma `P2002` on the `create()` and return a 409 with a clear "this CalDAV server is already connected" message.
- [x] 3.3 Hardening (from Codex review): documented in `schema.prisma` that this index must be provisioned via `migrate deploy`, not `db push` (which can't emit `NULLS NOT DISTINCT`), and added a guard test that fails if the migration ever drops `NULLS NOT DISTINCT`. (`src/__tests__/caldav-account-unique-migration.test.ts`)
- [x] 3.4 (Codex round 3) Migration safety: de-duplicate any pre-existing colliding rows (incl. null-userId duplicates the old NULLS-DISTINCT index allowed) before creating the index, reassigning the losing account's feeds to the survivor (non-destructive to events), and create-before-drop. Verified on a disposable Postgres 16 seeded with duplicate rows.
- [x] 3.5 (Codex round 3) Canonicalize the CalDAV server URL before storing it (`normalizeCalDAVServerUrl` in `caldav/utils.ts`, wired into the auth route) so host/scheme/default-port variants don't bypass the duplicate guard. (`src/__tests__/caldav-url-normalize.test.ts`)
- [x] 3.7 (Codex round 5) Normalize ORIGIN ONLY: preserve the path/query byte-for-byte so a path-based collection URL (e.g. Fastmail) is stored exactly as validated and not mutated for sync. And canonicalize existing `caldavUrl` values in the migration so legacy raw rows collide with post-upgrade reconnects (verified on a disposable Postgres 16: SQL canonicalization matches the JS normalizer; legacy vs canonical rows de-dup).
- [x] 3.8 (Codex round 6) Drop the URL fragment in both the normalizer and migration canonicalization (fragments aren't sent to the server, so `#a`/`#b` must not be distinct accounts). Also reassign `TaskProvider.accountId` (not just `CalendarFeed`) from a losing duplicate to the survivor so task sync isn't silently detached. Verified on a disposable Postgres 16 (feed+event+task-provider all reattached to the kept account).
- [x] 3.10 (Codex round 8) Scope the add-calendar existing-feed lookup in `src/app/api/calendar/caldav/route.ts` by `accountId` (matching `caldav/sync`), so two CalDAV accounts that return the same calendar URL each get their own feed instead of the second add returning the first account's feed. (`src/__tests__/caldav-add-calendar-account-scope.test.ts`)
- [x] 3.11 (Codex round 9) PostgreSQL >=15 requirement: the migration `NULLS NOT DISTINCT` needs PG15+, and `entrypoint.sh` runs `migrate deploy` at startup. Added a preflight `DO`-block in the migration that RAISEs a clear "requires PostgreSQL 15 or newer" error on older servers (verified on PG14), and documented the requirement in the README Prerequisites.
- [x] 3.12 (Codex round 9) Legacy URL canonicalization now drops userinfo (`user:pass@`) to match the runtime normalizer (which rebuilds from `URL.hostname`) - both so legacy credential-bearing URLs collide with canonical reconnects and so embedded credentials don't leak via the now-exposed `caldavUrl`. SQL verified to match the JS normalizer across userinfo/port/query/fragment/case edge cases on a disposable Postgres 16.
- [x] 3.9 (Codex round 7) Migration robustness: removed the `CREATE TEMP TABLE ... ON COMMIT DROP` (transaction-lifetime dependent) in favor of inline per-statement CTEs, and fixed the legacy-URL canonicalization to prepend a root `/` for host-only-with-query URLs so it matches the runtime normalizer exactly (`https://Host?x` -> `https://host/?x`). Verified end-to-end on a disposable Postgres 16 via `prisma migrate deploy` (the Docker entrypoint path): no temp table, query-only legacy URL canonicalizes correctly, feed/event/task-provider reassigned, no drift.
- [x] 3.6 (Codex round 3) Make multiple same-username CalDAV accounts distinguishable: `/api/accounts` returns `caldavUrl`, the settings store type carries it, and `AccountManager.tsx` shows it for CalDAV accounts.

## 4. Gate

- [x] 4.1 `npm run test:unit` green (new tests pass; pre-existing google-* timezone suites ignored).
- [x] 4.2 `npm run type-check` clean.
- [x] 4.3 `npm run lint` clean.
- [x] 4.4 Update `CHANGELOG.md` under `[unreleased]`.
