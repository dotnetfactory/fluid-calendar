import { normalizeCalDAVServerUrl } from "@/app/api/calendar/caldav/utils";

describe("normalizeCalDAVServerUrl", () => {
  it("collapses a trailing slash so it does not bypass the duplicate guard", () => {
    expect(normalizeCalDAVServerUrl("https://server.example.com/")).toBe(
      normalizeCalDAVServerUrl("https://server.example.com")
    );
  });

  it("lowercases scheme and host", () => {
    expect(normalizeCalDAVServerUrl("HTTPS://Server.Example.COM")).toBe(
      "https://server.example.com/"
    );
  });

  it("drops default ports (443/80)", () => {
    expect(normalizeCalDAVServerUrl("https://server.example.com:443")).toBe(
      normalizeCalDAVServerUrl("https://server.example.com")
    );
    expect(normalizeCalDAVServerUrl("http://server.example.com:80/dav")).toBe(
      normalizeCalDAVServerUrl("http://server.example.com/dav")
    );
  });

  it("keeps distinct servers distinct", () => {
    expect(normalizeCalDAVServerUrl("https://a.example.com")).not.toBe(
      normalizeCalDAVServerUrl("https://b.example.com")
    );
    // different (case-sensitive) paths stay distinct
    expect(normalizeCalDAVServerUrl("https://s.example.com/DAV")).not.toBe(
      normalizeCalDAVServerUrl("https://s.example.com/dav")
    );
    // non-default ports are preserved
    expect(normalizeCalDAVServerUrl("https://s.example.com:8443")).not.toBe(
      normalizeCalDAVServerUrl("https://s.example.com")
    );
  });

  it("returns the trimmed input unchanged when it is not a valid URL", () => {
    expect(normalizeCalDAVServerUrl("  not a url  ")).toBe("not a url");
  });
});
