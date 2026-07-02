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

  // The legacy-URL canonicalization must strip a redundant default port even
  // when the host is a bracketed IPv6 literal (e.g. "https://[::1]:443/dav"),
  // matching the runtime normalizer which yields "https://[::1]/dav". The host
  // group must therefore be greedy `(.+)` and NOT a colon-excluding class like
  // `[^:]+`, which cannot match the colons inside the brackets - the port would
  // survive and a post-upgrade reconnect would bypass the duplicate guard for
  // IPv6 servers. See issue #145.
  it("strips default ports for bracketed IPv6 hosts during legacy URL canon", () => {
    // greedy host group anchored on the trailing default port
    expect(sql).toMatch(/'\^\(\.\+\):443\$'/);
    expect(sql).toMatch(/'\^\(\.\+\):80\$'/);
    // the old colon-excluding class (the IPv6 bug) must be gone
    expect(sql).not.toMatch(/\[\^:\]\+\):(?:443|80)\$/);
  });
});
