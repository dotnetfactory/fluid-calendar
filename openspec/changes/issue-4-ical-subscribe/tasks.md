# Tasks

## 1. Types: add the `ICAL` feed type
- [x] 1.1 Add `"ICAL"` to the `CalendarFeed["type"]` union in `src/types/calendar.ts`
- [x] 1.2 Add `"ICAL"` to the feed/provider type casts in `src/lib/calendar-db.ts` and `src/app/(common)/calendar/page.tsx` (and any other `"GOOGLE" | "OUTLOOK" | "CALDAV"` literal that must accept iCal feeds for display)

## 2. Library: fetch + parse (pure core, unit-tested)
- [x] 2.1 Write failing unit tests for `src/lib/ical-feed.ts`: `normalizeIcalUrl` (http/https pass-through, webcal→https rewrite, reject other schemes) and `parseIcalEvents` (single event, recurring master with RRULE, all-day date-only event, empty/invalid body behavior)
- [x] 2.2 Implement `src/lib/ical-feed.ts` with `normalizeIcalUrl`, `parseIcalEvents` (using `ICAL.parse` + `convertVEventToCalendarEvent`), and `fetchIcalEvents(url, fetchImpl?)`; make the tests pass

## 3. API: iCal sync route
- [x] 3.1 Add `src/app/api/feeds/[id]/ical-sync/route.ts` (PUT) that authenticates the user, loads the feed (verify ownership + `type === "ICAL"`), fetches + parses via `ical-feed.ts`, and replaces events in a transaction (delete + createMany) updating `lastSync`; on fetch/parse failure return an error WITHOUT deleting existing events

## 4. Store wiring
- [x] 4.1 Widen `addFeed`'s `type` parameter to include `"ICAL"` and the `CalendarStore` interface accordingly
- [x] 4.2 Add an `ICAL` branch in `syncFeed` that calls `/api/feeds/[id]/ical-sync`
- [x] 4.3 Confirm `removeFeed`/`toggleFeed`/`updateFeed` handle `ICAL` via the existing generic `/api/feeds/[id]` else-branches (no change needed beyond verification)

## 5. UI
- [x] 5.1 Add `src/components/settings/ICalCalendarForm.tsx` (name + URL + optional color) that calls `addFeed(name, url, "ICAL", color)`
- [x] 5.2 Add a "Subscribe to iCal Calendar" button + form toggle in `src/components/settings/AccountManager.tsx`
- [x] 5.3 Add an iCal icon branch for `feed.type === "ICAL"` in `src/components/calendar/FeedManager.tsx`

## 6. Read-only behavior
- [x] 6.1 Verify `ICAL` is NOT in `WRITABLE_FEED_TYPES` (`src/lib/calendar-drag.ts`) and that store event-mutation methods reject `ICAL` (fall through to "Unsupported calendar type"); added a `calendar-drag` test asserting iCal feeds are read-only

## 7. Gate + docs
- [x] 7.1 Add a CHANGELOG `[Unreleased]` entry under Added referencing #4
- [x] 7.2 Run the local gate: `npm run test:unit`, `npm run type-check`, `npm run lint` (all green; pre-existing google-* test suites and a pre-existing token-manager type error on origin/main are ignored)

## 8. Codex review round 1 fixes (verdict needs-attention -> 3 HIGH findings)
- [x] 8.1 SSRF/resource hardening in `fetchIcalEvents`: block loopback/private/link-local/metadata hosts (literal IPs + DNS resolution via `assertSafeIcalHost`/`assertResolvedHostSafe`), manual redirect re-validation, `AbortController` timeout, streamed byte cap; unit tests for `assertSafeIcalHost`
- [x] 8.2 Recurring events render: add `expandIcalEvents` to materialize occurrence rows at sync time (the render path does not expand masters); wire into the sync route; unit tests for expansion
- [x] 8.3 Read-only enforced on delete: add `ICAL` rejection in store `removeEvent`; add server-side `isWritableFeedType` guards (403) to `/api/events` POST/PATCH/DELETE and `/api/events/[id]` PATCH/DELETE; unit tests for `isWritableFeedType`

## 9. Codex review round 2 (finalize): deeper hardening
- [x] 9.1 SSRF: IPv4-mapped IPv6 literals (`::ffff:127.0.0.1` canonicalized to `::ffff:7f00:1`) bypassed the private-IP guard; normalize dotted + hex mapped forms before classifying; regression tests
- [x] 9.2 Read-only: the generic `POST /api/feeds/[id]/sync` replaced events from caller JSON with no type check; reject non-writable (ICAL) feeds before deletion; route test
- [x] 9.3 Read-only: `PATCH /api/events/[id]` spread the raw body (smuggled `feedId` could retarget into a read-only/other feed); whitelist mutable fields; route test
- [x] 9.4 Recurrence: honor `EXDATE` so cancelled occurrences are not materialized; test
- [x] 9.5 DoS: bound recurrence generation (rrule iterator) per master AND a feed-level total-row cap so a dense ICS cannot expand into an unbounded write; tests
- [x] 9.6 Atomic subscribe: roll back the feed and rethrow if the first iCal sync fails (no broken feed left behind); store test
- [ ] 9.7 DEFERRED (documented `//todo`): pin the vetted IP into the fetch to defeat DNS rebinding (needs a custom undici dispatcher / egress layer; out of scope for the MVP subscribe path)
- [ ] 9.8 DEFERRED (documented `//todo`): honor `RDATE` and `RECURRENCE-ID` overrides for moved/edited recurring instances (a recurrence-exception feature beyond the MVP)
