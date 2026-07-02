-- Scope ConnectedAccount uniqueness by CalDAV server URL (issue #145).
--
-- The old key (userId, provider, email) blocked connecting a second CalDAV
-- server whenever the username matched an existing connection, because the
-- CalDAV "email" column stores the login username (not a globally unique
-- mailbox). Including caldavUrl in the key lets the same username be used on
-- different servers. NULLS NOT DISTINCT keeps OAuth rows (caldavUrl IS NULL)
-- one-per-(userId, provider, email), preserving the previous behavior for
-- Google/Outlook.

-- Requires PostgreSQL >= 15 for the unique-index `NULLS NOT DISTINCT` clause
-- below. `entrypoint.sh` runs `prisma migrate deploy` at startup, so fail fast
-- with a clear, actionable message on older servers instead of a cryptic syntax
-- error. (The bundled docker-compose uses postgres:16.)
DO $$
BEGIN
  IF current_setting('server_version_num')::int < 150000 THEN
    RAISE EXCEPTION
      'FluidCalendar migration 20260622130000 requires PostgreSQL 15 or newer (found %). The CalDAV account uniqueness index uses NULLS NOT DISTINCT. Please upgrade PostgreSQL.',
      current_setting('server_version');
  END IF;
END $$;

-- Canonicalize existing caldavUrl values to the SAME form the app now stores
-- (normalizeCalDAVServerUrl): lowercase scheme + host, drop any userinfo
-- (user:pass@) and the redundant default port, keep the path+query verbatim,
-- and drop the (server-irrelevant) fragment. The JS normalizer rebuilds the
-- origin from URL.protocol + URL.hostname (no userinfo) and always yields a "/"
-- pathname for an authority, so e.g. "https://U:P@Server.com:443?x=1" becomes
-- "https://server.com/?x=1". We replicate that here. Dropping userinfo also
-- avoids leaking embedded credentials now that caldavUrl is exposed in the
-- accounts API/UI. Without this, a legacy raw row would not match a post-upgrade
-- reconnect that stores the canonical form, recreating the very duplicate this
-- change prevents. No-op for already-canonical and non-CalDAV (null) values.
UPDATE "ConnectedAccount"
SET "caldavUrl" = (
  SELECT
    scheme
    -- host[:port], lowercased, userinfo stripped, redundant default port dropped
    -- only when it matches the scheme (https:443 / http:80), like the JS normalizer.
    -- The host group is greedy `.+` (not `[^:]+`) so a bracketed IPv6 literal
    -- whose host contains colons still has its trailing default port stripped,
    -- e.g. "[::1]:443" -> "[::1]" (matching URL.hostname); the `:443$`/`:80$`
    -- end-anchor keeps non-default ports like "[::1]:8443" intact.
    || CASE
         WHEN scheme = 'https://' THEN regexp_replace(hostport, '^(.+):443$', '\1')
         WHEN scheme = 'http://'  THEN regexp_replace(hostport, '^(.+):80$',  '\1')
         ELSE hostport
       END
    -- rest: path+query (fragment dropped); ensure it begins with "/" so a
    -- host-only or query-only legacy URL matches the URL-API form
    -- ("" -> "/", "?x" -> "/?x", "/dav" / "/dav?x" unchanged).
    || CASE WHEN rest = '' OR left(rest, 1) <> '/' THEN '/' || rest ELSE rest END
  FROM (
    SELECT
      lower(substring("caldavUrl" from '^[a-zA-Z][a-zA-Z0-9+.-]*://')) AS scheme,
      -- authority between '://' and first /?#, lowercased, with userinfo stripped.
      -- Strip through the LAST '@' (greedy), matching the URL API, so a password
      -- containing '@' (e.g. "user:p@ss@host") is fully removed.
      regexp_replace(
        lower(substring("caldavUrl" from '^[a-zA-Z][a-zA-Z0-9+.-]*://([^/?#]*)')),
        '^.*@',
        ''
      ) AS hostport,
      substring("caldavUrl" from '^[a-zA-Z][a-zA-Z0-9+.-]*://[^/?#]*([^#]*)') AS rest
  ) parts
)
WHERE "caldavUrl" IS NOT NULL
  AND "caldavUrl" ~ '^[a-zA-Z][a-zA-Z0-9+.-]*://';

-- De-duplicate any pre-existing rows that would collide under the new
-- NULLS NOT DISTINCT key before creating the index, so the CREATE never aborts
-- on legacy data. The old (userId, provider, email) index used the default
-- NULLS DISTINCT, so rows with a NULL userId could be duplicated; those collide
-- once NULLs are treated as equal. We keep the most recently updated row per key
-- (freshest tokens; ties broken by id) and remove the older duplicates. No-op on
-- clean databases.
--
-- Non-destructive: instead of deleting the losing account's feeds (which would
-- cascade-delete their CalendarEvents) or detaching its task providers, we
-- REASSIGN both to the surviving account, then delete only the losing rows.
--
-- The losing->surviving mapping is recomputed inline per statement (a CTE, not a
-- temp table) so there is no cross-statement temp-table dependency and the
-- migration is correct regardless of how the runner manages transactions.

-- Move feeds from each losing account to the surviving one (preserves events).
WITH ranked AS (
  SELECT "id",
         FIRST_VALUE("id") OVER w AS keep_id,
         ROW_NUMBER() OVER w AS rn
  FROM "ConnectedAccount"
  WINDOW w AS (
    PARTITION BY "userId", "provider", "email", "caldavUrl"
    ORDER BY "updatedAt" DESC, "id" DESC
  )
),
dups AS (SELECT "id" AS loser_id, keep_id FROM ranked WHERE rn > 1)
UPDATE "CalendarFeed" f
SET "accountId" = dups.keep_id
FROM dups
WHERE f."accountId" = dups.loser_id;

-- Move task-sync providers too (TaskProvider.accountId is ON DELETE SET NULL).
WITH ranked AS (
  SELECT "id",
         FIRST_VALUE("id") OVER w AS keep_id,
         ROW_NUMBER() OVER w AS rn
  FROM "ConnectedAccount"
  WINDOW w AS (
    PARTITION BY "userId", "provider", "email", "caldavUrl"
    ORDER BY "updatedAt" DESC, "id" DESC
  )
),
dups AS (SELECT "id" AS loser_id, keep_id FROM ranked WHERE rn > 1)
UPDATE "TaskProvider" tp
SET "accountId" = dups.keep_id
FROM dups
WHERE tp."accountId" = dups.loser_id;

-- Delete only the now-detached duplicate accounts.
WITH ranked AS (
  SELECT "id",
         ROW_NUMBER() OVER (
           PARTITION BY "userId", "provider", "email", "caldavUrl"
           ORDER BY "updatedAt" DESC, "id" DESC
         ) AS rn
  FROM "ConnectedAccount"
)
DELETE FROM "ConnectedAccount"
WHERE "id" IN (SELECT "id" FROM ranked WHERE rn > 1);

-- Order matters: create the replacement index BEFORE dropping the old one so the
-- table is never left without a uniqueness guard, even if this migration is
-- interrupted or run outside a transaction.

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedAccount_userId_provider_email_caldavUrl_key" ON "ConnectedAccount"("userId", "provider", "email", "caldavUrl") NULLS NOT DISTINCT;

-- DropIndex
DROP INDEX "ConnectedAccount_userId_provider_email_key";
