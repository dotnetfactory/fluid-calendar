## Why

Users want to reuse a project as a template (GitHub issue #60). Today projects can be created, edited, archived, and deleted, but there is no way to duplicate one - so a user who repeats the same set of tasks (the issue's example: a content-creation workflow) has to recreate the project and every task by hand each time.

The maintainer settled the desired behavior in the issue thread: "duplicate a project ... create a copy of a project with all the incomplete tasks in it ... a modal with a text box to type in the new name of the project." That is the scope this change delivers.

## What Changes

- Add a **duplicate project** action to the project sidebar (next to Edit) that opens a small modal with a single text box pre-filled with a suggested name (`Copy of <name>`), and a "Duplicate" button.
- Add a `POST /api/projects/:id/duplicate` endpoint that, for the authenticated owner, creates a new project copying the source project's `description` and `color` (name comes from the modal; status is forced to `active`), then copies every **incomplete** task (status not `completed`) into the new project.
- Copied tasks carry over template-relevant, user-owned fields (title, description, status, due/start dates, duration, priority, energy level, preferred time, recurrence, and tag associations) and **reset** instance-specific state that must not be cloned: external-sync identifiers, auto-schedule artifacts (scheduled start/end, score, pushed calendar block), completion timestamps, and postpone state. External task-list mappings are **not** duplicated (the copy is a fresh local project, not bound to an external list).
- Add a `duplicateProject` action to the project Zustand store so the new project appears immediately in the sidebar.

No schema migration is required (the copy uses existing models). The feature is core (not SAAS-gated) and additive.

## Capabilities

### New Capabilities
- `project-duplication`: Duplicating an existing project into a new project that copies the project's metadata and all of its incomplete tasks, for use as a template.

### Modified Capabilities
<!-- None: no existing spec defines project CRUD behavior yet. -->

## Impact

- New `src/app/api/projects/[id]/duplicate/route.ts` - `POST` handler that duplicates an owned project and its incomplete tasks in a single transaction.
- `src/store/project.ts` - add `duplicateProject(id, name)` that calls the endpoint and prepends the returned project to state.
- `src/components/projects/ProjectSidebar.tsx` - add a "Duplicate" icon button on each project row that opens the duplicate modal.
- New `src/components/projects/DuplicateProjectDialog.tsx` - the name-input modal that invokes `duplicateProject`.
- New `src/lib/__tests__/project-duplicate.test.ts` - unit tests for the copy logic (incomplete-only filter, field carry-over, field reset, mapping exclusion).
- `CHANGELOG.md` - note the user-facing addition under `[unreleased]`.
