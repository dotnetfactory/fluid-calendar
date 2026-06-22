import { classifyCalDAVError } from "../utils";

/**
 * Reproduces the error shapes reported in #117 (Radicale/self-signed TLS),
 * #115 (Baikal/iCloud), and #122 (Nextcloud genuine 401): connection/network
 * failures must be classified as connection errors (not "check your
 * credentials"), while a real 401 stays an auth error.
 */
describe("classifyCalDAVError", () => {
  it("classifies a `fetch failed` TypeError as a connection error (502)", () => {
    // What Node's fetch throws on a connection-layer failure.
    const err = new TypeError("fetch failed");
    const result = classifyCalDAVError(err);

    expect(result.kind).toBe("connection");
    expect(result.status).toBe(502);
    expect(result.message.toLowerCase()).toContain("connect");
    expect(result.message.toLowerCase()).not.toContain("credentials");
    expect(result.details).toBe("fetch failed");
  });

  it("classifies a nested ENOTFOUND cause (DNS failure) as a connection error", () => {
    const cause = Object.assign(new Error("getaddrinfo ENOTFOUND dav.local"), {
      code: "ENOTFOUND",
    });
    const err = new TypeError("fetch failed", { cause });

    const result = classifyCalDAVError(err);

    expect(result.kind).toBe("connection");
    expect(result.status).toBe(502);
  });

  it("classifies a self-signed TLS cert failure (#117) as a connection error", () => {
    // The exact code from the #117 debug probe.
    const cause = Object.assign(
      new Error("unable to verify the first certificate"),
      { code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE" }
    );
    const err = new TypeError("fetch failed", { cause });

    const result = classifyCalDAVError(err);

    expect(result.kind).toBe("connection");
    expect(result.status).toBe(502);
    expect(result.message.toLowerCase()).toContain("certificate");
  });

  it("classifies ECONNREFUSED as a connection error", () => {
    const cause = Object.assign(
      new Error("connect ECONNREFUSED 127.0.0.1:8351"),
      { code: "ECONNREFUSED" }
    );
    const err = new TypeError("fetch failed", { cause });

    expect(classifyCalDAVError(err).kind).toBe("connection");
  });

  it("classifies ETIMEDOUT as a connection error", () => {
    const cause = Object.assign(new Error("connect ETIMEDOUT"), {
      code: "ETIMEDOUT",
    });
    const err = new TypeError("fetch failed", { cause });

    expect(classifyCalDAVError(err).kind).toBe("connection");
  });

  it("classifies tsdav's `Invalid credentials` (a real 401, #122) as an auth error (401)", () => {
    // tsdav throws this only when the server returns HTTP 401.
    const err = new Error("Invalid credentials");
    const result = classifyCalDAVError(err);

    expect(result.kind).toBe("auth");
    expect(result.status).toBe(401);
    expect(result.message.toLowerCase()).toContain("credentials");
    expect(result.details).toBe("Invalid credentials");
  });

  it("classifies a malformed server URL (ERR_INVALID_URL) as a connection error", () => {
    // What Node's fetch throws for an unparseable URL.
    const cause = Object.assign(
      new Error("Invalid URL"),
      { code: "ERR_INVALID_URL" }
    );
    const err = new TypeError("Failed to parse URL from not a url", { cause });

    const result = classifyCalDAVError(err);

    expect(result.kind).toBe("connection");
    expect(result.status).toBe(502);
    expect(result.message.toLowerCase()).toContain("server url");
  });

  it("does NOT treat our local `Invalid base URL` path-construction error as a connection error", () => {
    // formatAbsoluteUrl throws these for a malformed path; they must stay a
    // client/path error, not a 502 connection error.
    expect(classifyCalDAVError(new Error("Invalid base URL: foo")).kind).toBe(
      "auth"
    );
    expect(
      classifyCalDAVError(new Error("Invalid URL in path: /bad")).kind
    ).toBe("auth");
  });

  it("defaults an unrecognized error to an auth error (no regression below today's behavior)", () => {
    const err = new Error("something completely unexpected");
    const result = classifyCalDAVError(err);

    expect(result.kind).toBe("auth");
    expect(result.status).toBe(401);
    expect(result.message.toLowerCase()).toContain("credentials");
  });

  it("handles a non-Error thrown value without throwing", () => {
    const result = classifyCalDAVError("fetch failed");
    expect(result.kind).toBe("connection");
    expect(result.details).toBe("fetch failed");
  });
});
