import { readFileSync } from "fs";
import { join } from "path";

// Guard: the OAuth-uniqueness invariant depends on the ConnectedAccount unique
// index being created with `NULLS NOT DISTINCT`, which Prisma's `@@unique` DSL
// cannot express. The semantics therefore live in the hand-written migration.
// This test fails loudly if that clause is ever dropped (e.g. a regenerated or
// edited migration), since without it duplicate Google/Outlook accounts (with a
// null caldavUrl) would become possible. See issue #145.
describe("ConnectedAccount unique-by-server-url migration", () => {
  const migrationPath = join(
    process.cwd(),
    "prisma",
    "migrations",
    "20260622130000_caldav_account_unique_by_server_url",
    "migration.sql"
  );
  const sql = readFileSync(migrationPath, "utf8");

  it("creates the (userId, provider, email, caldavUrl) unique index", () => {
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX[^;]*"ConnectedAccount_userId_provider_email_caldavUrl_key"[^;]*\("userId",\s*"provider",\s*"email",\s*"caldavUrl"\)/
    );
  });

  it("preserves NULLS NOT DISTINCT so OAuth rows (null caldavUrl) stay unique", () => {
    expect(sql).toMatch(/NULLS NOT DISTINCT/);
  });

  it("drops the old (userId, provider, email) unique index", () => {
    expect(sql).toMatch(/DROP INDEX[^;]*"ConnectedAccount_userId_provider_email_key"/);
  });
});
