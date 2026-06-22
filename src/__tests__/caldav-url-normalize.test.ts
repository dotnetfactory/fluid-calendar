import { normalizeCalDAVServerUrl } from "@/app/api/calendar/caldav/utils";

describe("normalizeCalDAVServerUrl", () => {
  it("collapses a host-only trailing slash so it does not bypass the duplicate guard", () => {
    // Both parse to an empty/root path, so they canonicalize identically.
    expect(normalizeCalDAVServerUrl("https://server.example.com/")).toBe(
      normalizeCalDAVServerUrl("https://server.example.com")
    );
  });

  it("lowercases scheme and host", () => {
    expect(normalizeCalDAVServerUrl("HTTPS://Server.Example.COM/dav")).toBe(
      "https://server.example.com/dav"
    );
  });

  it("drops default ports (443/80) but keeps non-default ports", () => {
    expect(normalizeCalDAVServerUrl("https://server.example.com:443/dav")).toBe(
      normalizeCalDAVServerUrl("https://server.example.com/dav")
    );
    expect(normalizeCalDAVServerUrl("http://server.example.com:80/dav")).toBe(
      normalizeCalDAVServerUrl("http://server.example.com/dav")
    );
    expect(normalizeCalDAVServerUrl("https://s.example.com:8443")).not.toBe(
      normalizeCalDAVServerUrl("https://s.example.com")
    );
  });

  it("preserves the path byte-for-byte (no trailing-slash trimming, no case change)", () => {
    // A path-style CalDAV collection URL must be stored exactly as validated:
    // its trailing slash and case are significant for sync.
    expect(
      normalizeCalDAVServerUrl("https://caldav.fastmail.com/dav/calendars/user/x/")
    ).toBe("https://caldav.fastmail.com/dav/calendars/user/x/");
    expect(normalizeCalDAVServerUrl("https://s.example.com/DAV")).not.toBe(
      normalizeCalDAVServerUrl("https://s.example.com/dav")
    );
    // path with vs without trailing slash are now distinct (endpoint-significant)
    expect(normalizeCalDAVServerUrl("https://s.example.com/dav/")).not.toBe(
      normalizeCalDAVServerUrl("https://s.example.com/dav")
    );
  });

  it("drops the fragment (client-only, not sent to the server)", () => {
    // Two URLs differing only by fragment hit the same endpoint and must not
    // be treated as distinct accounts.
    expect(normalizeCalDAVServerUrl("https://s.example.com/dav#a")).toBe(
      normalizeCalDAVServerUrl("https://s.example.com/dav#b")
    );
    expect(normalizeCalDAVServerUrl("https://s.example.com/dav#a")).toBe(
      "https://s.example.com/dav"
    );
  });

  it("preserves the query string", () => {
    expect(normalizeCalDAVServerUrl("https://s.example.com/dav?x=1")).toBe(
      "https://s.example.com/dav?x=1"
    );
  });

  it("keeps distinct servers distinct", () => {
    expect(normalizeCalDAVServerUrl("https://a.example.com")).not.toBe(
      normalizeCalDAVServerUrl("https://b.example.com")
    );
  });

  it("returns the trimmed input unchanged when it is not a valid URL", () => {
    expect(normalizeCalDAVServerUrl("  not a url  ")).toBe("not a url");
  });
});
