-- Scope ConnectedAccount uniqueness by CalDAV server URL (issue #145).
--
-- The old key (userId, provider, email) blocked connecting a second CalDAV
-- server whenever the username matched an existing connection, because the
-- CalDAV "email" column stores the login username (not a globally unique
-- mailbox). Including caldavUrl in the key lets the same username be used on
-- different servers. NULLS NOT DISTINCT keeps OAuth rows (caldavUrl IS NULL)
-- one-per-(userId, provider, email), preserving the previous behavior for
-- Google/Outlook.
--
-- Order matters: create the replacement index BEFORE dropping the old one so
-- the table is never left without a uniqueness guard, even if this migration
-- is interrupted or run outside a transaction. (Prisma runs each migration in
-- a transaction by default, so DROP+CREATE is atomic; this ordering is a
-- belt-and-suspenders safeguard.) Adding caldavUrl to the key can only make
-- existing rows more distinct, so no legacy row can violate the new index.

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedAccount_userId_provider_email_caldavUrl_key" ON "ConnectedAccount"("userId", "provider", "email", "caldavUrl") NULLS NOT DISTINCT;

-- DropIndex
DROP INDEX "ConnectedAccount_userId_provider_email_key";
