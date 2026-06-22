## Context

External read-only calendars are commonly published as a single static iCal/ICS document at a public URL (sports schedules, holidays, etc.). FluidCalendar already syncs Google/Outlook/CalDAV into local `CalendarFeed` + `CalendarEvent` rows and renders only from local data (local-first). The reusable pieces already exist:

- `src/lib/caldav-helpers.ts` - `convertVEventToCalendarEvent(vevent)` converts an `ICAL.Component` VEVENT into a `CalendarEvent`, including RRULE → `recurrenceRule` and all-day detection. `ical.js` is a dependency.
- `src/app/api/feeds/route.ts` (POST/PATCH/DELETE) - generic, type-agnostic feed CRUD scoped to the user.
- `src/app/api/feeds/[id]/sync/route.ts` - replaces a feed's events with a supplied array (client-supplied events).
- `src/store/calendar.ts` `getExpandedEvents` - expands master events via `RRule` at render time, so we only store masters.

What is missing is any path that **fetches and parses a plain ICS URL**. `store.syncFeed` only dispatches to Google/Outlook/CalDAV sync endpoints; the old "iCal feeds use the existing API" comment refers to feed CRUD, not an actual fetch+parse.

## Goals / Non-Goals

Goals:
- Subscribe to a public ICS URL as a read-only `ICAL` feed; fetch + parse + store; manual refresh; remove.
- Reuse the existing parser and the existing render-time recurrence expansion.
- Keep blast radius small and consistent with existing feed handling.

Non-Goals:
- Authenticated ICS URLs (basic-auth / tokens) - out of scope.
- Background/scheduled refresh - no open-source scheduler exists today; left as a future SAAS enhancement (`//todo`).
- Uploading a local `.ics` file - that is issue #167 (separate change).
- Two-way sync / editing - `ICAL` feeds are read-only.

## Decisions

### Feed type value: `ICAL`
Add `ICAL` to the `CalendarFeed["type"]` union and the related provider/feed-type unions. `CalendarFeed.type` is a free-form `String` column in Prisma, so no migration is needed. Chose `ICAL` (not `ICS`) to read naturally as "iCal subscription"; the value is internal so either works, `ICAL` matches the user-facing wording on the issue.

### Server does the fetch, not the browser
The fetch happens server-side (in the sync API route), not in the browser, to avoid CORS issues with arbitrary third-party ICS hosts and to keep the parser on the server. This differs from the existing `/api/feeds/[id]/sync` route, which expects the client to pass the parsed events. We therefore add a dedicated route:

`PUT|POST /api/feeds/[id]/ical-sync` - loads the feed (verifying ownership and `type === "ICAL"`), fetches `feed.url`, parses it with a new `src/lib/ical-feed.ts`, and replaces the feed's events inside a transaction (delete-then-createMany), updating `lastSync`. On fetch/parse failure it returns an error and does **not** delete existing events (sync is only committed on a successful parse).

`src/lib/ical-feed.ts` exports:
- `normalizeIcalUrl(url): string` - rewrites `webcal://` → `https://`, validates `http(s)`, throws on other schemes.
- `parseIcalEvents(icsText): Partial<CalendarEvent>[]` - `ICAL.parse` → root `ICAL.Component` → for each `vevent` subcomponent call `convertVEventToCalendarEvent`, returning the fields needed for `createMany` (strip the placeholder `id`/`feedId`/timestamps so the DB assigns them). This is the **pure, unit-testable** core.
- `fetchIcalEvents(url, fetchImpl?): Promise<...>` - normalize, fetch, hand the body to `parseIcalEvents`. `fetchImpl` is injectable for tests.

Keeping `normalizeIcalUrl` and `parseIcalEvents` pure (no network, no DB) is what the TDD unit tests target; the route is a thin wrapper.

### Store wiring
`addFeed` gains an `"ICAL"` branch: it already falls through to the generic `/api/feeds` POST for non-Google types, so the main work is (a) widen the `type` parameter union to include `"ICAL"`, and (b) make `syncFeed` call `/api/feeds/[id]/ical-sync` for `ICAL` feeds. `removeFeed`/`toggleFeed`/`updateFeed` already use the generic `/api/feeds/[id]` path for non-Google feeds, so `ICAL` is handled by the existing else-branches. Event mutation methods (`addEvent`/`updateEvent`/`removeEvent`) have no `ICAL` branch, so they fall through to "Unsupported calendar type" - which is the desired read-only behavior.

### Read-only enforcement
`ICAL` is deliberately **not** added to `WRITABLE_FEED_TYPES` in `src/lib/calendar-drag.ts`, so drag/resize is disabled, and the store's event-mutation methods reject it. No extra code needed for read-only; it is the default.

### UI
Add a "Connect iCal Calendar" button in `AccountManager.tsx` next to "Connect CalDAV Calendar" that toggles a small `ICalCalendarForm` (name, URL, optional color). On submit it calls `useCalendarStore.addFeed(name, url, "ICAL", color)`. Add an iCal icon branch in `FeedManager.tsx` (e.g. `BsLink45Deg` / `BsCalendarEvent` from `react-icons/bs`) so subscribed feeds are visually distinct; the existing refresh/remove controls already work for them. Widen the `type` cast in `src/app/(common)/calendar/page.tsx` to include `"ICAL"`.

## Risks / Trade-offs

- **Large feeds / SSRF**: fetching an arbitrary user-supplied URL server-side is a mild SSRF surface. Mitigation: restrict to `http(s)`/`webcal`, and cap the response size when reading the body. Internal-network blocking is broader than this issue and matches no existing pattern in the repo (CalDAV already fetches user-supplied server URLs), so we keep parity with CalDAV and note it.
- **No incremental sync**: we replace all events on each refresh (same as the existing `/api/feeds/[id]/sync` and CalDAV full sync). Fine for the static-document model of ICS.
- **No background refresh in OSS**: users must refresh manually, consistent with current OSS feed behavior. Documented + `//todo` for SAAS.

## Migration Plan

None. `CalendarFeed.type` is already a `String`; adding the `ICAL` value needs no DB migration. No data backfill. Feature is additive and gated only by the new UI entry point.

## Open Questions

None blocking. Authenticated ICS and scheduled refresh are explicitly deferred.
