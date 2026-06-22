-- Scope ConnectedAccount uniqueness by CalDAV server URL (issue #145).
--
-- The old key (userId, provider, email) blocked connecting a second CalDAV
-- server whenever the username matched an existing connection, because the
-- CalDAV "email" column stores the login username (not a globally unique
-- mailbox). Including caldavUrl in the key lets the same username be used on
-- different servers. NULLS NOT DISTINCT keeps OAuth rows (caldavUrl IS NULL)
-- one-per-(userId, provider, email), preserving the previous behavior for
-- Google/Outlook.

-- Safety: de-duplicate any pre-existing rows that would collide under the new
-- NULLS NOT DISTINCT key before creating the index, so the CREATE never aborts
-- on legacy data. The old (userId, provider, email) index used the default
-- NULLS DISTINCT, so rows with a NULL userId could be duplicated; those would
-- collide once NULLs are treated as equal. We keep the most recently updated
-- row per key (it carries the freshest tokens; ties broken by id) and delete
-- older duplicates. This is a no-op on clean databases.
--
-- Compute the losing duplicate account ids once, drop their dependent calendar
-- feeds (CalendarFeed.accountId has no cascade), then drop the accounts.
CREATE TEMP TABLE "_dup_connected_accounts" ON COMMIT DROP AS
SELECT "id" FROM (
  SELECT "id",
         ROW_NUMBER() OVER (
           PARTITION BY "userId", "provider", "email", "caldavUrl"
           ORDER BY "updatedAt" DESC, "id" DESC
         ) AS rn
  FROM "ConnectedAccount"
) ranked
WHERE ranked.rn > 1;

DELETE FROM "CalendarFeed"
WHERE "accountId" IN (SELECT "id" FROM "_dup_connected_accounts");

DELETE FROM "ConnectedAccount"
WHERE "id" IN (SELECT "id" FROM "_dup_connected_accounts");

-- Order matters: create the replacement index BEFORE dropping the old one so
-- the table is never left without a uniqueness guard, even if this migration
-- is interrupted or run outside a transaction. (Prisma runs each migration in
-- a transaction by default, so DROP+CREATE is atomic; this ordering is a
-- belt-and-suspenders safeguard.)

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedAccount_userId_provider_email_caldavUrl_key" ON "ConnectedAccount"("userId", "provider", "email", "caldavUrl") NULLS NOT DISTINCT;

-- DropIndex
DROP INDEX "ConnectedAccount_userId_provider_email_key";
