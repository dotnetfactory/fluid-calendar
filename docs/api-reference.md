# FluidCalendar API Reference (v1)

Programmatic access to your tasks and calendar so external tools — automation
platforms (Zapier/n8n), meeting assistants, scripts, or your own apps — can
create items and let FluidCalendar's auto-scheduler position your todos.

- **Base URL:** `https://<your-instance>/api/v1`
- **Versioning:** in the URL path (`/api/v1`). Breaking changes ship under a new
  version; `v1` stays stable.

## Authentication

1. In FluidCalendar, open **Settings → API & Developer** and turn on
   **Enable API access** (off by default).
2. Click **Create key**, give it a name, and copy the key. The full key is shown
   **once** and never again — store it somewhere safe.
3. Send it as a bearer token on every request:

```bash
curl https://<your-instance>/api/v1/tasks \
  -H "Authorization: Bearer fcal_xxxxxxxxxxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Keys look like `fcal_<prefix>_<secret>`. Only a SHA-256 hash is stored server
side. Revoke a key any time from the same settings page; disabling **Enable API
access** rejects all of your keys at once without deleting them.

> Key-management endpoints (creating/revoking keys, the enable toggle) are
> intentionally **not** reachable with an API key — they require a logged-in
> session, so a leaked key cannot mint more keys.

## Conventions

**Errors** use a consistent envelope:

```json
{ "error": { "code": "INVALID_ARGUMENT", "message": "title is required", "field": "title" } }
```

| Code | HTTP | Meaning |
|------|------|---------|
| `UNAUTHORIZED` | 401 | Missing/invalid key or session |
| `FORBIDDEN` | 403 | API access not enabled for the account |
| `INVALID_ARGUMENT` | 400 | Malformed/invalid request body |
| `NOT_FOUND` | 404 | Resource not found (or not yours) |
| `RATE_LIMITED` | 429 | Too many requests — see `Retry-After` |
| `INTERNAL` | 500 | Unexpected server error |

**Pagination** (list endpoints) is cursor-based:

```json
{ "data": [ ... ], "next_cursor": "abc123", "has_more": true }
```

Pass `?cursor=<next_cursor>&limit=50` to page (default `limit` 50, max 500).

**Rate limiting:** every response carries `X-RateLimit-Limit`,
`X-RateLimit-Remaining`, and `X-RateLimit-Reset`. On 429 a `Retry-After`
(seconds) header is included. The scheduling path is limited more tightly than
reads/writes because a replan is expensive.

**Idempotency:** include an `Idempotency-Key` header on write requests. The
first successful response is stored and replayed for any retry with the same
key, so a flaky network or a re-fired webhook can't double-create.

## Tasks

### `POST /api/v1/tasks`

Create one task or a batch. Send a single object **or an array** of them.

Fields: `title` (required), `description`, `duration` (minutes, default 30),
`priority`, `energyLevel`, `preferredTime`, `dueDate`, `projectId`, `tagIds`,
`recurrenceRule` (RRULE string).

To have FluidCalendar auto-position a task, include an `autoScheduled` object:

```json
{
  "title": "Follow up with Clay",
  "duration": 30,
  "autoScheduled": { "deadline": "2026-06-25T17:00:00Z", "deadlineType": "SOFT" }
}
```

`deadlineType` is `HARD`, `SOFT`, or `NONE`. When any item in the request is
`autoScheduled`, the scheduler runs **once** for the whole batch and the
response includes each task's booked `scheduledStart` / `scheduledEnd`.

> **Timezone:** auto-scheduling requires your account to have a timezone set
> (Settings → User) and auto-schedule configured. Otherwise the request returns
> 400 — we won't guess and risk placing tasks in the wrong timezone.

```bash
# A meeting's worth of todos in one call, auto-scheduled
curl -X POST https://<your-instance>/api/v1/tasks \
  -H "Authorization: Bearer $FCAL_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: mtg-2026-06-21-001" \
  -d '[
    {"title":"Send recap deck","duration":45,"autoScheduled":{"deadlineType":"SOFT"}},
    {"title":"Email Dr. Rob","duration":15,"autoScheduled":{"deadlineType":"SOFT"}}
  ]'
```

### `GET /api/v1/tasks`

List your tasks. Query: `cursor`, `limit`, `status`. Returns a paginated list.

### `GET|PATCH|DELETE /api/v1/tasks/{id}`

Read, update, or delete one of your tasks. `PATCH` accepts any subset of the
create fields. Returns 404 for an id that isn't yours.

## Events

Events are fixed-time calendar entries (not auto-scheduled).

### `POST /api/v1/events`

Create one event or a batch. Fields: `title`, `start`, `end` (required;
`end` must be after `start`), `description`, `location`, `allDay`,
`isRecurring`, `recurrenceRule`. You do **not** pass a calendar id — events land
on your local calendar automatically.

```bash
curl -X POST https://<your-instance>/api/v1/events \
  -H "Authorization: Bearer $FCAL_KEY" -H "Content-Type: application/json" \
  -d '{"title":"Sync with Clay","start":"2026-06-24T15:00:00Z","end":"2026-06-24T15:30:00Z"}'
```

### `GET /api/v1/events`

List your events. Query: `from`, `to` (ISO range), `cursor`, `limit`.

### `GET|PATCH|DELETE /api/v1/events/{id}`

Read, update, or delete one of your events. Returns 404 for an id that isn't
yours.

## Scheduling

### `POST /api/v1/schedule`

Trigger a full replan of your auto-scheduled tasks (the same thing
`autoScheduled` does on create, run on demand). Returns the count and the
re-positioned tasks. Rate-limited more tightly than other endpoints.

```bash
curl -X POST https://<your-instance>/api/v1/schedule -H "Authorization: Bearer $FCAL_KEY"
```

## Roadmap (not in v1 yet)

`/api/v1/sync` (incremental sync + batched commands for offline apps), projects
/ tags / settings resources, a first-party mobile OAuth flow, granular per-key
scopes, structured (non-RRULE) recurrence, and an OpenAPI spec. None of these
will break the v1 contract above.
