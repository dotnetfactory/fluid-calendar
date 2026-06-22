## Context

Project CRUD lives in `src/app/api/projects/route.ts` (list/create) and `src/app/api/projects/[id]/route.ts` (get/update/delete), backed by the `Project` and `Task` Prisma models. The store is `src/store/project.ts`; the UI entry point is `src/components/projects/ProjectSidebar.tsx`, where each row already has an Edit (pencil) action and an optional sync action. There is no spec for project CRUD yet, so this introduces a new `project-duplication` capability rather than modifying an existing one.

The maintainer's settled scope (issue #60 comments): a modal with a name text box that copies the project "with all the incomplete tasks in it." A non-member's Asana screenshot showed a richer per-field "Include" checklist; the maintainer acknowledged the inspiration but did not adopt the checklist, so this change implements the simpler settled behavior and leaves a granular include-list as possible future work.

## Goals / Non-Goals

Goals:
- One-click duplicate of an owned project from the sidebar, with an editable new name.
- The copy contains the project metadata and all incomplete tasks, usable immediately as a template.
- Server-side ownership enforcement and an atomic copy (all-or-nothing).

Non-Goals:
- No per-field "Include" checklist (description/tags/etc. toggles) - out of the settled scope.
- No duplication of completed tasks, external task-list mappings, calendar blocks, or schedule artifacts.
- No cross-user copying or sharing.

## Decisions

### What counts as "incomplete"
A task is copied when `status !== "completed"` (i.e. `todo` or `in_progress`). This matches the maintainer's "all the incomplete tasks" and the existing `TaskStatus` enum (`src/types/task.ts`).

### Fields copied vs reset (the core of the feature)
A pure helper `buildDuplicatedTaskData(task, newProjectId, userId)` produces the Prisma create payload for one copied task, so the carry-over/reset rules are unit-testable without a DB.

- **Carried over** (template-relevant, user-owned): `title`, `description`, `status`, `dueDate`, `startDate`, `duration`, `priority`, `energyLevel`, `preferredTime`, `isRecurring`, `recurrenceRule`, and `tags` (re-connected to the same existing Tag rows by id).
- **Reset / omitted** (instance- or sync-specific, must not be cloned):
  - External sync: `externalTaskId`, `source`, `externalListId`, `externalCreatedAt`, `externalUpdatedAt`, `lastSyncedAt`, `syncStatus`, `syncError`, `syncHash` (left null/default); `skipSync` defaults to false.
  - Auto-schedule artifacts: `isAutoScheduled` -> false, `scheduleLocked` -> false, `scheduledStart`/`scheduledEnd`/`scheduleScore`/`lastScheduled` -> null.
  - Calendar block push: `blockEventId`/`blockFeedId` -> null, `blockDirty` -> false.
  - Lifecycle: `completedAt` -> null, `lastCompletedDate` -> null, `postponedUntil` -> null.
  - Identity/metadata: new `id`, fresh `createdAt`/`updatedAt` (Prisma defaults).
- `userId` is set to the requesting user (the new project's owner), never copied blindly from the source row.

Rationale: cloning external IDs or sync hashes would make two local tasks claim the same external task (corrupting one-way task sync, see `src/lib/task-sync/`); cloning schedule/block fields would point the copy at calendar events it does not own. Resetting them yields a clean, unscheduled template.

### Project metadata
The new project copies `description` and `color`; `name` comes from the modal (defaulting client-side to `Copy of <name>`); `status` is forced to `active` (a duplicate is meant to be worked on, even if the source was archived). External sync fields (`externalId`, `externalSource`, `lastSyncedAt`) are not copied, and `taskListMappings` are not duplicated.

### Atomicity & ownership
The endpoint loads the source project filtered by `{ id, userId }` (404 if not owned/found), then performs the project create + all task creates inside a single `prisma.$transaction`, mirroring the delete route's transactional pattern. The handler uses `authenticateRequest` like the sibling routes, defines a `LOG_SOURCE`, and uses the `prisma` singleton and `logger`.

Tags are connected via `connect: [{ id }]` so duplicated tasks reference the same Tag rows (tags are user-scoped, shared across tasks) rather than creating duplicate Tag rows.

### API shape
`POST /api/projects/:id/duplicate` with body `{ name?: string }`. If `name` is blank/absent the server falls back to `Copy of <source name>`. Returns the created project with `_count.tasks`, matching the create endpoint's response shape so the store can prepend it directly.

## Risks / Trade-offs

- **Large projects**: copying many tasks in one transaction is heavier than a single insert, but project task counts are modest and the delete route already does bulk task operations transactionally. Acceptable.
- **Future include-list**: the settled scope is the simple modal; if a granular checklist is later wanted, the helper and endpoint can be extended with flags without breaking this contract.

## Migration Plan

None - no schema change. Purely additive endpoint + store action + UI.
