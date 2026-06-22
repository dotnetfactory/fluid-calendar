## Why

When adding a CalDAV account, every failure is reported to the user as an
authentication failure - "Failed to authenticate with CalDAV server. Please
check your credentials." (HTTP 401) - regardless of the real cause. This sends
users down the wrong debugging path and has produced three separate issues:

- **#117 (Radicale, self-signed TLS):** the server log shows
  `error: 'fetch failed'` and the user's own debug probe returns
  `UNABLE_TO_VERIFY_LEAF_SIGNATURE` - a TLS/connection failure - yet the UI
  reports a login failure. The connection never reached the point of checking
  credentials.
- **#115 (Baikal / iCloud):** "Please check your credentials" shown even though
  the same iCloud app-password works in other clients - the user cannot tell
  whether it is really a credentials problem or a connectivity/path problem.
- **#122 (Nextcloud):** here the failure genuinely *is* a 401 - the reporter
  confirms `STATUS: 401 Unauthorized`, "I am able to reach the CalDAV server but
  I am not able to log into it." For this case the credentials message is
  correct and must be preserved.

Root cause: the three CalDAV connection routes (`test`, `auth`, `available`)
each catch the `loginToCalDAVServer` error and unconditionally return the
credentials message with status 401. They do not inspect the error.

The two failure classes are distinguishable. `tsdav`'s login throws
`Error("Invalid credentials")` only for an HTTP 401 from the server
(`fetchPrincipalUrl`); a network/DNS/TLS/refused failure surfaces as the
runtime's `TypeError: fetch failed` whose `cause.code` is one of `ENOTFOUND`,
`ECONNREFUSED`, `ETIMEDOUT`, `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, etc. A shared
classifier can map the former to an auth error (401, keep the credentials
message) and the latter to a connection error (502, a connection-oriented
message that points at the server URL, network, and TLS certificate).

## What Changes

- Add a shared `classifyCalDAVError(error)` helper in
  `src/app/api/calendar/caldav/utils.ts` that inspects an unknown thrown value
  and returns a discriminated result: `{ kind: "connection" | "auth", message,
  status, details }`.
  - **connection**: a network-layer failure (`fetch failed`/`TypeError` from
    fetch; or an error/`cause` `code`/message matching DNS, refused, reset,
    timeout, unreachable, or TLS-certificate failures). Message:
    "Could not connect to the CalDAV server. Please check the server URL,
    your network/firewall, and (for self-signed certificates) the server's TLS
    certificate." Status `502`.
  - **auth**: a genuine credentials rejection (`Invalid credentials`, or a 401
    in the error/message). Message: "Failed to authenticate with CalDAV server.
    Please check your credentials." Status `401`.
  - Anything else defaults to **auth** so behavior never regresses below the
    current credentials/401 response. (The wrapping `try/catch` in each route
    keeps the existing generic 500 for non-login failures.)
- Wire the helper into the `loginToCalDAVServer` catch block of every CalDAV
  login boundary - `test/route.ts`, `auth/route.ts`, `available/route.ts`, and
  the add-selected-calendar `route.ts` - so each returns the classified message
  + status instead of the hardcoded credentials/401.
- Surface the classified error in the available-calendars list
  (`AvailableCalendars.tsx`), which previously swallowed a non-OK response and
  rendered a generic empty state. A small pure helper
  (`extractCalendarFetchError`) reads the server's `error` field (falling back
  to a default), and the component shows it as an error state with a retry. The
  JSON response shape (`{ error, details, success? }`) is otherwise unchanged;
  `CalDAVAccountForm` already renders `data.error` verbatim.
- Add unit coverage for the classifier (connection vs auth across the real
  error shapes from #117/#122) and for the route wiring (a `fetch failed`
  login error yields a connection message + 502; an `Invalid credentials`
  login error yields the credentials message + 401).

This does not change credential storage, the path-validation branch, or the
generic catch-all error handling - only how a *login* failure is classified and
reported.

## Capabilities

### New Capabilities
- `caldav-connection-error-reporting`: a CalDAV connection attempt that fails
  SHALL report whether the failure was a network/TLS connection error or a
  genuine authentication error, with a matching message and HTTP status.

### Modified Capabilities
<!-- None -->

## Impact

- Code: `src/app/api/calendar/caldav/utils.ts` (new `classifyCalDAVError`
  helper); `src/app/api/calendar/caldav/test/route.ts`,
  `src/app/api/calendar/caldav/auth/route.ts`,
  `src/app/api/calendar/caldav/available/route.ts`, and
  `src/app/api/calendar/caldav/route.ts` (use the helper in the login-failure
  catch); `src/components/settings/AvailableCalendars.tsx` +
  `src/components/settings/available-calendars-error.ts` (surface the server
  error in the list view). New unit tests under
  `src/app/api/calendar/caldav/__tests__/` and
  `src/components/settings/__tests__/`.
- No schema, dependency, or UI changes. Risk is confined to the message and
  status returned for a CalDAV login failure; the default-to-auth fallback means
  no failure becomes *less* informative than today.
- Resolves #122, #117, #115.
