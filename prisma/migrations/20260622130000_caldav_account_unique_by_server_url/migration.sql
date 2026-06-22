-- Scope ConnectedAccount uniqueness by CalDAV server URL (issue #145).
--
-- The old key (userId, provider, email) blocked connecting a second CalDAV
-- server whenever the username matched an existing connection, because the
-- CalDAV "email" column stores the login username (not a globally unique
-- mailbox). Including caldavUrl in the key lets the same username be used on
-- different servers. NULLS NOT DISTINCT keeps OAuth rows (caldavUrl IS NULL)
-- one-per-(userId, provider, email), preserving the previous behavior for
-- Google/Outlook.

-- Canonicalize existing caldavUrl values to the SAME form the app now stores
-- (normalizeCalDAVServerUrl): lowercase the scheme://host[:port] authority and
-- drop the redundant default port, leaving the path/query/fragment untouched.
-- The JS normalizer parses with the URL API, which appends a root "/" path when
-- none is present, so a host-only legacy value ("https://Server.com") becomes
-- "https://server.com/"; we replicate that here. Without this, a legacy raw row
-- would not match a post-upgrade reconnect that stores the canonical form,
-- recreating the very duplicate this change prevents - but only for existing
-- users. No-op for already-canonical and non-CalDAV (null) values.
UPDATE "ConnectedAccount"
SET "caldavUrl" = (
  -- authority: lowercased scheme://host[:port], with a redundant :443/:80 dropped
  regexp_replace(
    lower(substring("caldavUrl" from '^[a-zA-Z][a-zA-Z0-9+.-]*://[^/?#]*')),
    '^(https://[^:/?#]+):443$|^(http://[^:/?#]+):80$',
    '\1\2'
  )
  -- rest: path+query+fragment verbatim, defaulting to "/" when there is none
  -- (matching the URL API the JS normalizer uses, which appends a root path)
  || CASE
       WHEN substring("caldavUrl" from '^[a-zA-Z][a-zA-Z0-9+.-]*://[^/?#]*(.*)$') = ''
         THEN '/'
       ELSE substring("caldavUrl" from '^[a-zA-Z][a-zA-Z0-9+.-]*://[^/?#]*(.*)$')
     END
)
WHERE "caldavUrl" IS NOT NULL
  AND "caldavUrl" ~ '^[a-zA-Z][a-zA-Z0-9+.-]*://';

-- Safety: de-duplicate any pre-existing rows that would collide under the new
-- NULLS NOT DISTINCT key before creating the index, so the CREATE never aborts
-- on legacy data. The old (userId, provider, email) index used the default
-- NULLS DISTINCT, so rows with a NULL userId could be duplicated; those would
-- collide once NULLs are treated as equal. We keep the most recently updated
-- row per key (it carries the freshest tokens; ties broken by id) and remove
-- the older duplicates. This is a no-op on clean databases.
--
-- This is non-destructive to calendar data: instead of deleting the losing
-- account's feeds (which would cascade-delete their CalendarEvents), we
-- REASSIGN each losing account's feeds to the surviving account for the same
-- key, then delete only the now-detached losing account rows.
CREATE TEMP TABLE "_dup_connected_accounts" ON COMMIT DROP AS
SELECT "id" AS loser_id, "keep_id"
FROM (
  SELECT "id",
         FIRST_VALUE("id") OVER (
           PARTITION BY "userId", "provider", "email", "caldavUrl"
           ORDER BY "updatedAt" DESC, "id" DESC
         ) AS "keep_id",
         ROW_NUMBER() OVER (
           PARTITION BY "userId", "provider", "email", "caldavUrl"
           ORDER BY "updatedAt" DESC, "id" DESC
         ) AS rn
  FROM "ConnectedAccount"
) ranked
WHERE ranked.rn > 1;

-- Move feeds from each losing account to the surviving one (preserves events).
UPDATE "CalendarFeed" f
SET "accountId" = d."keep_id"
FROM "_dup_connected_accounts" d
WHERE f."accountId" = d.loser_id;

-- Delete only the now-detached duplicate accounts.
DELETE FROM "ConnectedAccount"
WHERE "id" IN (SELECT loser_id FROM "_dup_connected_accounts");

-- Order matters: create the replacement index BEFORE dropping the old one so
-- the table is never left without a uniqueness guard, even if this migration
-- is interrupted or run outside a transaction. (Prisma runs each migration in
-- a transaction by default, so DROP+CREATE is atomic; this ordering is a
-- belt-and-suspenders safeguard.)

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedAccount_userId_provider_email_caldavUrl_key" ON "ConnectedAccount"("userId", "provider", "email", "caldavUrl") NULLS NOT DISTINCT;

-- DropIndex
DROP INDEX "ConnectedAccount_userId_provider_email_key";
