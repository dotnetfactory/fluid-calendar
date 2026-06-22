/**
 * Proves the CalDAV connection routes (`test`, `auth`, `available`) report a
 * login failure through the shared classifier: a connection failure
 * (`fetch failed`, #117) becomes a connection message + 502, while a genuine
 * credentials rejection (`Invalid credentials`, #122) stays the credentials
 * message + 401. `classifyCalDAVError` is exercised for real; only the login
 * primitive and the auth/db boundaries are mocked.
 */
import { getToken } from "next-auth/jwt";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

import * as utils from "../utils";

jest.mock("next-auth/jwt", () => ({ getToken: jest.fn() }));
jest.mock("@/lib/auth/api-auth", () => ({ authenticateRequest: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    connectedAccount: { findUnique: jest.fn() },
    calendarFeed: { findMany: jest.fn() },
  },
}));

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
const mockAuthenticateRequest = authenticateRequest as jest.MockedFunction<
  typeof authenticateRequest
>;

/** Narrows a route handler's `Response | undefined` return to a defined Response. */
function assertResponse<T>(res: T | undefined): T {
  if (res == null) throw new Error("expected a route response, got undefined");
  return res;
}

const FETCH_FAILED = new TypeError("fetch failed");
const INVALID_CREDS = new Error("Invalid credentials");

function jsonRequest(body: unknown) {
  return {
    json: async () => body,
    url: "http://localhost/api/calendar/caldav/test",
  } as unknown as Parameters<
    typeof import("../test/route")["POST"]
  >[0];
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe("CalDAV test route classifies login failures", () => {
  beforeEach(() => {
    mockGetToken.mockResolvedValue({ sub: "user-1" } as never);
    jest
      .spyOn(utils, "createCalDAVClient")
      .mockReturnValue({} as ReturnType<typeof utils.createCalDAVClient>);
  });

  it("returns a connection error (502) for `fetch failed`", async () => {
    jest.spyOn(utils, "loginToCalDAVServer").mockRejectedValue(FETCH_FAILED);
    const { POST } = await import("../test/route");

    const res = await POST(
      jsonRequest({ serverUrl: "https://dav.local", username: "u", password: "p" })
    );
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error.toLowerCase()).toContain("connect");
    expect(data.error.toLowerCase()).not.toContain("credentials");
    expect(data.details).toBe("fetch failed");
  });

  it("returns an auth error (401) for `Invalid credentials`", async () => {
    jest.spyOn(utils, "loginToCalDAVServer").mockRejectedValue(INVALID_CREDS);
    const { POST } = await import("../test/route");

    const res = await POST(
      jsonRequest({ serverUrl: "https://dav.local", username: "u", password: "p" })
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error.toLowerCase()).toContain("credentials");
  });
});

describe("CalDAV auth route classifies login failures", () => {
  beforeEach(() => {
    mockAuthenticateRequest.mockResolvedValue({ userId: "user-1" } as never);
    jest
      .spyOn(utils, "createCalDAVClient")
      .mockReturnValue({} as ReturnType<typeof utils.createCalDAVClient>);
  });

  it("returns a connection error (502) for `fetch failed`", async () => {
    jest.spyOn(utils, "loginToCalDAVServer").mockRejectedValue(FETCH_FAILED);
    const { POST } = await import("../auth/route");

    const res = assertResponse(
      await POST(
        jsonRequest({
          serverUrl: "https://dav.local",
          username: "u",
          password: "p",
        })
      )
    );
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error.toLowerCase()).toContain("connect");
    expect(data.error.toLowerCase()).not.toContain("credentials");
  });

  it("returns an auth error (401) for `Invalid credentials`", async () => {
    jest.spyOn(utils, "loginToCalDAVServer").mockRejectedValue(INVALID_CREDS);
    const { POST } = await import("../auth/route");

    const res = assertResponse(
      await POST(
        jsonRequest({
          serverUrl: "https://dav.local",
          username: "u",
          password: "p",
        })
      )
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error.toLowerCase()).toContain("credentials");
  });
});

describe("CalDAV available route classifies login failures", () => {
  beforeEach(() => {
    mockAuthenticateRequest.mockResolvedValue({ userId: "user-1" } as never);
    (prisma.connectedAccount.findUnique as jest.Mock).mockResolvedValue({
      id: "acc-1",
      provider: "CALDAV",
      caldavUrl: "https://dav.local",
      caldavUsername: "u",
      accessToken: "p",
      userId: "user-1",
    });
    jest
      .spyOn(utils, "createCalDAVClient")
      .mockReturnValue({} as ReturnType<typeof utils.createCalDAVClient>);
  });

  function getRequest() {
    return {
      url: "http://localhost/api/calendar/caldav/available?accountId=acc-1",
    } as unknown as Parameters<
      typeof import("../available/route")["GET"]
    >[0];
  }

  it("returns a connection error (502) for `fetch failed`", async () => {
    jest.spyOn(utils, "loginToCalDAVServer").mockRejectedValue(FETCH_FAILED);
    const { GET } = await import("../available/route");

    const res = assertResponse(await GET(getRequest()));
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error.toLowerCase()).toContain("connect");
    expect(data.error.toLowerCase()).not.toContain("credentials");
  });

  it("returns an auth error (401) for `Invalid credentials`", async () => {
    jest.spyOn(utils, "loginToCalDAVServer").mockRejectedValue(INVALID_CREDS);
    const { GET } = await import("../available/route");

    const res = assertResponse(await GET(getRequest()));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error.toLowerCase()).toContain("credentials");
  });

  it("classifies a post-login `fetch failed` (calendar discovery) as a connection error (502)", async () => {
    // Login succeeds, but the next CalDAV network hop fails with fetch failed.
    jest.spyOn(utils, "loginToCalDAVServer").mockResolvedValue(true);
    jest.spyOn(utils, "fetchCalDAVCalendars").mockRejectedValue(FETCH_FAILED);
    const { GET } = await import("../available/route");

    const res = assertResponse(await GET(getRequest()));
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error.toLowerCase()).toContain("connect");
  });
});

describe("CalDAV add-calendar route classifies login failures", () => {
  beforeEach(() => {
    mockAuthenticateRequest.mockResolvedValue({ userId: "user-1" } as never);
    (prisma.connectedAccount.findUnique as jest.Mock).mockResolvedValue({
      id: "acc-1",
      provider: "CALDAV",
      caldavUrl: "https://dav.local",
      caldavUsername: "u",
      accessToken: "p",
      userId: "user-1",
    });
    jest
      .spyOn(utils, "createCalDAVClient")
      .mockReturnValue({} as ReturnType<typeof utils.createCalDAVClient>);
  });

  function addRequest() {
    return {
      json: async () => ({ accountId: "acc-1", calendarId: "https://dav.local/c/" }),
      url: "http://localhost/api/calendar/caldav",
    } as unknown as Parameters<typeof import("../route")["POST"]>[0];
  }

  it("returns a connection error (502) for `fetch failed`", async () => {
    jest.spyOn(utils, "loginToCalDAVServer").mockRejectedValue(FETCH_FAILED);
    const { POST } = await import("../route");

    const res = assertResponse(await POST(addRequest()));
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error.toLowerCase()).toContain("connect");
    expect(data.error.toLowerCase()).not.toContain("credentials");
  });

  it("returns an auth error (401) for `Invalid credentials`", async () => {
    jest.spyOn(utils, "loginToCalDAVServer").mockRejectedValue(INVALID_CREDS);
    const { POST } = await import("../route");

    const res = assertResponse(await POST(addRequest()));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error.toLowerCase()).toContain("credentials");
  });

  it("classifies a post-login `fetch failed` (calendar fetch) as a connection error (502)", async () => {
    jest.spyOn(utils, "loginToCalDAVServer").mockResolvedValue(true);
    jest.spyOn(utils, "fetchCalDAVCalendars").mockRejectedValue(FETCH_FAILED);
    const { POST } = await import("../route");

    const res = assertResponse(await POST(addRequest()));
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error.toLowerCase()).toContain("connect");
  });
});
