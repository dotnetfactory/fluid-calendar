# Tasks

## 1. Shared classifier (TDD)

- [x] 1.1 Write `src/app/api/calendar/caldav/__tests__/classifyCalDAVError.test.ts`
  covering: `fetch failed` `TypeError` -> connection/502; nested
  `cause.code === "ENOTFOUND"` -> connection/502;
  `UNABLE_TO_VERIFY_LEAF_SIGNATURE` (self-signed TLS, #117) -> connection/502;
  `ECONNREFUSED`/`ETIMEDOUT` -> connection/502; `Invalid credentials`
  (tsdav 401, #122) -> auth/401; an unrecognized error string -> auth/401
  (default); `details` always carries the raw message.
- [x] 1.2 Implement `classifyCalDAVError(error: unknown): ClassifiedCalDAVError`
  in `src/app/api/calendar/caldav/utils.ts` (walks the `cause` chain, matches the
  connection/TLS token list - including a malformed server URL,
  `ERR_INVALID_URL`/"Failed to parse URL", treated as connection - and defaults
  unknown to auth). Export the type.

## 2. Wire the routes (TDD)

- [x] 2.1 Write route tests under
  `src/app/api/calendar/caldav/__tests__/` proving each route maps a login
  failure through the classifier: a `fetch failed` login error -> connection
  message + status 502; an `Invalid credentials` login error -> credentials
  message + status 401. Cover `test`, `auth`, and `available`.
- [x] 2.2 Replace the hardcoded credentials/401 response in the
  `loginToCalDAVServer` catch of `test/route.ts`, `auth/route.ts`,
  `available/route.ts`, and the add-selected-calendar `route.ts` with the
  classified `{ error, details }` + status (keep each route's existing
  `success: false` field where it has one).

## 2b. Surface the error in the available-calendars list (TDD)

- [x] 2b.1 Test `extractCalendarFetchError` (pure helper): returns the server
  `error` field; falls back to a default when the body has no error / is not
  JSON.
- [x] 2b.2 Add `src/components/settings/available-calendars-error.ts` and wire
  `AvailableCalendars.tsx` to set/render an error state (with retry) from a
  non-OK available-calendars response instead of the generic empty state.
- [x] 2b.3 Also surface the classified error when the add-calendar POST fails
  (the click handler previously swallowed it), reusing the helper with a
  "Failed to add calendar" fallback.

## 2c. Classify post-login connection failures (TDD)

- [x] 2c.1 Tests: a `fetch failed` thrown by a post-login CalDAV network call
  (calendar discovery in add-calendar / list-available, and path validation in
  connect) -> connection message + 502 (not a generic 500 / bad-path 400).
- [x] 2c.2 Scope the connection classification to the post-login CalDAV calls
  themselves: wrap `fetchCalDAVCalendars` in `route.ts`, `available/route.ts`,
  the path-validation `fetchCalDAVCalendars` in `auth/route.ts`, and both the
  path-verification and discovery `fetchCalDAVCalendars` branches in
  `test/route.ts`, returning the connection message + 502 for a connection
  error and re-throwing / keeping the existing message otherwise. The discovery
  branch in `test/route.ts` returns immediately on a connection error instead
  of continuing toward a misleading no-calendars result. The outer catches keep
  their generic 500 so a DB/pool error is never mislabeled as a CalDAV
  connection failure.
- [x] 2c.3 Build `formatAbsoluteUrl(serverUrl, caldavPath)` outside the network
  try in `auth/route.ts` and `test/route.ts`, so a malformed path (a local URL
  construction error) stays a 400 bad-path response and is never misclassified
  as a connection error. The classifier no longer matches a bare "invalid url"
  (only the fetch-specific `ERR_INVALID_URL` / "Failed to parse URL").

## 3. Verify

- [x] 3.1 New tests green (`npm run test:unit`) - 29 new tests pass.
- [x] 3.2 `npm run type-check` clean.
- [x] 3.3 `npm run lint` clean.
- [x] 3.4 Update `CHANGELOG.md` under `[Unreleased] > Fixed`.
