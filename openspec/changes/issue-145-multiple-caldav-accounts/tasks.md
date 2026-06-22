## 1. Tests (red first)

- [x] 1.1 Add a unit test for `TokenManager.storeTokens` (Google/Outlook): updates the existing account in place for a repeated `(userId, provider, email)` and creates a new one otherwise, without using the `userId_provider_email` named input. (`src/lib/__tests__/token-manager-store.test.ts`)
- [x] 1.2 Add a unit test for the CalDAV auth route's duplicate handling: a Prisma `P2002` from `connectedAccount.create()` maps to a 409 with a "server already connected" message (not the generic "check your credentials" 500). (`src/__tests__/caldav-auth-duplicate.test.ts`)

## 2. Schema + migration

- [x] 2.1 Change `ConnectedAccount` in `prisma/schema.prisma`: replace `@@unique([userId, provider, email])` with a 4-column unique key over `(userId, provider, email, caldavUrl)`. (`nullsNotDistinct` is not expressible in Prisma 6.3's `@@unique` DSL, so the NULLS-NOT-DISTINCT semantics live in the migration SQL; `prisma migrate diff` confirms no drift between schema and the migrated DB.)
- [x] 2.2 Add a Prisma migration that drops the old `ConnectedAccount_userId_provider_email_key` index and creates the new `UNIQUE (...) NULLS NOT DISTINCT` index. Verified by applying the full migration history to a disposable Postgres 16 and checking the resulting index definition + drift. (`prisma/migrations/20260622130000_caldav_account_unique_by_server_url`)

## 3. Code

- [x] 3.1 Rewrite `TokenManager.storeTokens` to find the existing OAuth account by `(userId, provider, email)` (`findFirst`) and `update` by `id`, else `create` - no dependency on the named composite key. (`src/lib/token-manager.ts`)
- [x] 3.2 In `src/app/api/calendar/caldav/auth/route.ts`, catch Prisma `P2002` on the `create()` and return a 409 with a clear "this CalDAV server is already connected" message.

## 4. Gate

- [x] 4.1 `npm run test:unit` green (new tests pass; pre-existing google-* timezone suites ignored).
- [x] 4.2 `npm run type-check` clean.
- [x] 4.3 `npm run lint` clean.
- [x] 4.4 Update `CHANGELOG.md` under `[unreleased]`.
