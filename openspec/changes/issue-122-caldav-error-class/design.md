## Context

Three CalDAV routes establish a connection by creating a `tsdav` `DAVClient`
and calling `loginToCalDAVServer` (which calls `client.login()`):

- `POST /api/calendar/caldav/test` - "Test Connection" button.
- `POST /api/calendar/caldav/auth` - "Connect" (persists the account).
- `GET  /api/calendar/caldav/available` - lists calendars for a saved account.

Each wraps the login in a `try/catch` whose catch hardcodes:

```ts
return NextResponse.json(
  { error: "Failed to authenticate with CalDAV server. Please check your credentials.", details },
  { status: 401 }
);
```

The catch never inspects the error, so a network/TLS failure is reported as an
auth failure. This is the bug behind #117, #115, and (partly) #122.

## Error shapes (grounded in tsdav + the Node fetch runtime)

- **Genuine auth (HTTP 401).** `tsdav`'s `fetchPrincipalUrl` does
  `if (response.status === 401) throw new Error("Invalid credentials")`. So a
  credentials rejection reaches our catch as `Error` with message
  `"Invalid credentials"`. #122's reporter confirmed a real `401 Unauthorized`.
- **Connection / network / TLS.** `client.login()` performs a `fetch`. A DNS,
  refused, reset, timeout, unreachable, or TLS-verification failure throws the
  runtime's `TypeError: fetch failed`, whose `cause` is the underlying system
  error carrying a `code` such as `ENOTFOUND`, `ECONNREFUSED`, `ECONNRESET`,
  `ETIMEDOUT`, `EHOSTUNREACH`, `ENETUNREACH`, `EAI_AGAIN`, or a TLS code like
  `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, `SELF_SIGNED_CERT_IN_CHAIN`,
  `DEPTH_ZERO_SELF_SIGNED_CERT`, `CERT_HAS_EXPIRED`. The issue logs show exactly
  `error: 'fetch failed'` (#117) and `UNABLE_TO_VERIFY_LEAF_SIGNATURE` (#117
  debug probe).

## Decision

Add one pure, framework-free classifier in `utils.ts` and call it from all three
catch blocks.

```ts
export type CalDAVErrorKind = "connection" | "auth";
export interface ClassifiedCalDAVError {
  kind: CalDAVErrorKind;
  message: string;   // user-facing
  status: number;    // HTTP status to return
  details: string;   // original error message, for the `details` field
}
export function classifyCalDAVError(error: unknown): ClassifiedCalDAVError;
```

Classification (first match wins):

1. **connection** when the error looks network-layer:
   - it is a `TypeError` whose message includes `fetch failed`; or
   - the error message, or any nested `cause` chain's message/`code`, matches a
     known connection/TLS token (case-insensitive): `fetch failed`, `ENOTFOUND`,
     `ECONNREFUSED`, `ECONNRESET`, `ETIMEDOUT`, `EHOSTUNREACH`, `ENETUNREACH`,
     `EAI_AGAIN`, `EPIPE`, `UNABLE_TO_VERIFY_LEAF_SIGNATURE`,
     `SELF_SIGNED_CERT_IN_CHAIN`, `DEPTH_ZERO_SELF_SIGNED_CERT`,
     `CERT_HAS_EXPIRED`, `ERR_TLS_CERT_ALTNAME_INVALID`, `certificate`,
     `ECONN`, `getaddrinfo`, `network`, `socket hang up`, `timed out`.
   - message: `"Could not connect to the CalDAV server. Please check the server
     URL, your network/firewall, and (for self-signed certificates) the server's
     TLS certificate."`; status `502`.
2. **auth** otherwise (includes `Invalid credentials`, an explicit `401`, and
   any unrecognized error - defaulting unknowns to auth means the response is
   never *less* informative than today's hardcoded behavior). message:
   `"Failed to authenticate with CalDAV server. Please check your credentials."`;
   status `401`.

`details` always carries the raw error message so the existing test-results UI
still surfaces the technical cause.

### Why default unknown -> auth (not connection)

Today every login failure is auth/401. Defaulting unknowns to auth guarantees no
regression for cases we cannot positively identify, while the explicit
connection allow-list captures the documented `fetch failed`/TLS family from the
issues. A `502` for connection failures is correct semantics (bad upstream
gateway), and distinct from `401` so the frontend/log clearly separates the two.

### Why a shared helper, not per-route logic

The three routes have identical catch blocks; a single helper keeps them
consistent and is independently unit-testable against the exact error shapes
from the issues, without spinning up Next route handlers.

## Traversing `cause`

Node wraps the system error in `TypeError.cause`. The classifier walks the
`cause` chain (bounded depth to avoid cycles) collecting `message` and `code`
from each `Error`-like link, so it catches both `err.message === "fetch failed"`
and `err.cause.code === "ENOTFOUND"`.

## Alternatives considered

- **Status-code parsing only.** tsdav only throws a generic `Invalid
  credentials` string for 401 and a bare `fetch failed` for connection errors;
  there is no structured status on the thrown value, so string/`code` matching
  is required.
- **Change the UI.** Unnecessary - the UI already renders `data.error`. Keeping
  the response shape stable avoids touching `CalDAVAccountForm` /
  `AvailableCalendars` and keeps the diff minimal.
- **Classify inside `loginToCalDAVServer`.** That helper is also used as a
  throwing primitive; classification belongs at the HTTP boundary where a
  status code is chosen. The helper keeps re-throwing.

## Risks

- A server that returns a non-401 auth-ish status (403) still falls into the
  auth default; acceptable - it is closer to the truth than "connection" and
  matches prior behavior. Out of scope to enumerate every status.
- Token lists are heuristic; the default-to-auth fallback bounds the blast
  radius of a miss.
