## ADDED Requirements

### Requirement: Subscribe to a public iCal/ICS URL

FluidCalendar SHALL allow a user to subscribe to an external read-only calendar published at a public iCal/ICS URL by creating a calendar feed of type `ICAL`. The feed SHALL store the URL and be associated with the current user, and SHALL NOT require any OAuth account or credentials. Only `http`/`https` URLs SHALL be accepted; `webcal://` URLs SHALL be normalized to `https://` before fetching.

#### Scenario: Add an iCal feed with a valid URL

- **WHEN** a user submits a name and a public `https` ICS URL through the "Connect iCal Calendar" form
- **THEN** a `CalendarFeed` of type `ICAL` is created for that user with the given name, URL, and color
- **AND** the feed's events are fetched and stored immediately
- **AND** the feed appears in the "Your Calendars" list

#### Scenario: webcal URL is normalized

- **WHEN** a user submits a URL beginning with `webcal://`
- **THEN** the URL is fetched as `https://` (the scheme is rewritten before the request)

#### Scenario: Reject a non-http(s) URL

- **WHEN** a user submits a URL whose scheme is not `http`, `https`, or `webcal`
- **THEN** the subscription is rejected with a validation error and no feed is created

### Requirement: Fetch and parse iCal events into local calendar events

FluidCalendar SHALL fetch the ICS document from the feed's URL over HTTP(S) and parse it with the existing `ical.js`-based helpers, converting each `VEVENT` into a `CalendarEvent` belonging to the feed. Recurring events SHALL be materialized into concrete occurrence rows within a bounded window at sync time (anchored on each event's start) so they render in calendar views, alongside a retained master row that preserves the recurrence rule. A fetch failure or unparseable body SHALL surface as a sync error on the feed rather than crashing, and SHALL leave any previously synced events intact.

#### Scenario: Parse single and recurring events

- **WHEN** an ICS body containing a one-off `VEVENT` and a recurring `VEVENT` with an `RRULE` is fetched
- **THEN** the one-off event is stored as a non-recurring `CalendarEvent`
- **AND** the recurring event yields a master `CalendarEvent` (with its `recurrenceRule` populated and `isMaster` true) plus materialized occurrence rows within the sync window

#### Scenario: Recurring occurrences render

- **WHEN** a subscribed feed contains a recurring `VEVENT` with an `RRULE`
- **THEN** concrete occurrence rows are stored for dates within the sync window
- **AND** those occurrences appear in day/week/month calendar views

#### Scenario: All-day events preserved

- **WHEN** an ICS body contains a `VEVENT` with a `DTSTART;VALUE=DATE` (date-only) value
- **THEN** the stored `CalendarEvent` is marked `allDay`

#### Scenario: Fetch failure surfaces as an error

- **WHEN** the ICS URL returns a non-success HTTP status or a body that cannot be parsed as a calendar
- **THEN** the sync operation reports an error
- **AND** events previously synced for the feed are not deleted

### Requirement: iCal fetching is hardened against SSRF and resource exhaustion

Because the feed URL is user-supplied and fetched server-side, FluidCalendar SHALL refuse to fetch hosts that are loopback, private, link-local, or cloud-metadata addresses (both as literal IPs and as hostnames that resolve to such addresses), SHALL NOT automatically follow redirects to unvalidated hosts (each redirect hop is re-validated), SHALL abort a fetch that exceeds a time limit, and SHALL enforce a maximum response size.

#### Scenario: Reject internal/private targets

- **WHEN** a feed URL points at `localhost`, a loopback/private/link-local IP, a cloud metadata address, or a hostname resolving to one of those
- **THEN** the fetch is refused and no request is made to that address

#### Scenario: Redirects are re-validated

- **WHEN** a fetched URL responds with a redirect
- **THEN** the redirect target is validated against the same host rules before being followed

#### Scenario: Oversized or hung responses are bounded

- **WHEN** a response exceeds the maximum allowed size or the request exceeds the time limit
- **THEN** the fetch is aborted and reported as a sync error

### Requirement: Manually refresh and remove an iCal feed

FluidCalendar SHALL let a user re-sync an `ICAL` feed on demand, which re-fetches the URL and replaces the feed's stored events with the freshly parsed set. The user SHALL also be able to enable/disable and remove an `ICAL` feed using the same controls as other feeds. Removing a feed SHALL delete its stored events.

#### Scenario: Manual refresh replaces events

- **WHEN** a user clicks the refresh control for an `ICAL` feed
- **THEN** the URL is re-fetched and parsed
- **AND** the feed's events are replaced with the newly parsed events
- **AND** the feed's `lastSync` timestamp is updated

#### Scenario: Remove an iCal feed

- **WHEN** a user removes an `ICAL` feed
- **THEN** the feed and all of its stored events are deleted

### Requirement: iCal feeds are read-only

FluidCalendar SHALL treat `ICAL` feeds as read-only. The application SHALL NOT offer create, update, drag, or delete operations on events belonging to an `ICAL` feed, and any such attempt SHALL be rejected both in the client and by the server event APIs (so a direct request cannot mutate iCal events).

#### Scenario: Editing an iCal event is rejected client-side

- **WHEN** client code attempts to create, update, or delete an event on a feed of type `ICAL`
- **THEN** the operation is rejected before any mutation request is sent
- **AND** the event's stored data is unchanged

#### Scenario: Direct API mutation of an iCal event is rejected

- **WHEN** a create/update/delete request reaches the generic event APIs for an event whose feed is type `ICAL`
- **THEN** the server rejects it with a read-only (403) response
- **AND** the event's stored data is unchanged
