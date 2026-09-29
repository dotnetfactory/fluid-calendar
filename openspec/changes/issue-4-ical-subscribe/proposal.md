## Why

Users have read-only external calendars published as public iCal/ICS URLs (sports schedules, holidays, shared community calendars) that aren't reachable through Google/Outlook/CalDAV accounts. Today there is no way to bring those into FluidCalendar, so those events live outside the app. The maintainer already endorsed this on the issue ("ical will be coming soon. i have most of the plumbing for it.") - the generic feed routes and the `ical.js` parser exist, but no end-to-end path fetches and parses a plain ICS URL. (GitHub issue #4.)

## What Changes

- Add a new calendar feed type `ICAL` for subscribing to a public iCal/ICS URL (no authentication, read-only one-way sync into our local DB), alongside the existing `GOOGLE`/`OUTLOOK`/`CALDAV` types.
- Add a server-side library that fetches an ICS URL, parses it with the existing `ical.js` helpers, and converts VEVENTs into `CalendarEvent` rows (reusing `convertVEventToCalendarEvent`). Recurring masters are stored with their `recurrenceRule` and expanded at render time by the existing `getExpandedEvents` logic.
- Add a sync API route for iCal feeds that re-fetches the URL and replaces the feed's events (matching the existing replace-on-sync behavior of `/api/feeds/[id]/sync`).
- Wire the calendar store (`addFeed`, `removeFeed`, `toggleFeed`, `updateFeed`, `syncFeed`) so iCal feeds create/sync/refresh through the generic `/api/feeds` routes.
- Add a "Connect iCal Calendar" form (name + URL + color) in the account/calendar settings UI, mirroring the existing "Connect CalDAV Calendar" entry point, and show iCal feeds in the "Your Calendars" sidebar with their own icon and the existing manual refresh/remove controls.
- iCal feeds are read-only: they are not added to the writable feed types, so event create/update/delete is rejected for them automatically.

Refresh model matches existing open-source behavior: events sync when the feed is added and when the user clicks the manual refresh button (there is no open-source background scheduler today). A scheduled background refresh is left as a future SAAS enhancement (`//todo`), out of scope here.

## Capabilities

### New Capabilities
- `ical-subscription`: subscribing to a public iCal/ICS URL as a read-only calendar feed - fetch, parse, store, display, manually refresh, and remove.

### Modified Capabilities
<!-- None: no existing spec's requirements change. -->

## Impact

- **Schema**: `CalendarFeed.type` gains an `ICAL` value (the column is a free-form `String`, so no migration is required).
- **Types**: the `CalendarFeed["type"]` union and related `provider`/feed-type unions gain `"ICAL"`.
- **New code**: `src/lib/ical-feed.ts` (fetch + parse), `src/app/api/feeds/[id]/ical-sync/route.ts` (sync route), `src/components/settings/ICalCalendarForm.tsx` (add form).
- **Modified code**: `src/types/calendar.ts`, `src/store/calendar.ts`, `src/components/calendar/FeedManager.tsx`, `src/components/settings/AccountManager.tsx`, `src/app/(common)/calendar/page.tsx`.
- **Dependencies**: none new - reuses `ical.js` (already a dependency) and the existing generic feed routes.
- iCal feeds carry no `ConnectedAccount` (public URL), so they do not touch OAuth/token-manager flows.
