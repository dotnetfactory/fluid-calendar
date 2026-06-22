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
- [x] 3.4 (Codex round 3) Migration safety: de-duplicate any pre-existing colliding rows (incl. null-userId duplicates the old NULLS-DISTINCT index allowed) and their dependent calendar feeds before creating the index, and create-before-drop. Verified on a disposable Postgres 16 seeded with duplicate rows.
- [x] 3.5 (Codex round 3) Canonicalize the CalDAV server URL before storing it (`normalizeCalDAVServerUrl` in `caldav/utils.ts`, wired into the auth route) so trailing-slash/case/default-port variants don't bypass the duplicate guard. (`src/__tests__/caldav-url-normalize.test.ts`)
- [x] 3.6 (Codex round 3) Make multiple same-username CalDAV accounts distinguishable: `/api/accounts` returns `caldavUrl`, the settings store type carries it, and `AccountManager.tsx` shows it for CalDAV accounts.

## 4. Gate

- [x] 4.1 `npm run test:unit` green (new tests pass; pre-existing google-* timezone suites ignored).
- [x] 4.2 `npm run type-check` clean.
- [x] 4.3 `npm run lint` clean.
- [x] 4.4 Update `CHANGELOG.md` under `[unreleased]`.
