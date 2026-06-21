## 1. Pure copy helper (TDD)

- [x] 1.1 Add `src/lib/projects/duplicate.ts` exporting `buildDuplicatedTaskData(task, newProjectId, userId)` that returns the Prisma task-create payload: carries over template fields (title, description, status, dueDate, startDate, duration, priority, energyLevel, preferredTime, isRecurring, recurrenceRule) + `tags: { connect: [...] }`, sets `projectId`/`userId`, and resets all sync/schedule/block/lifecycle fields
- [x] 1.2 Add `src/lib/__tests__/project-duplicate.test.ts` covering: incomplete-only is the caller's filter (helper itself copies status as-is); carried fields preserved; external-sync fields reset to null/false; schedule artifacts reset; block fields reset; completion/postpone fields reset; tags connected by id; userId set to requester not source
- [x] 1.3 Run `npm run test:unit` for the new suite: red (module missing) -> green (9/9)

## 2. Duplicate API endpoint (green)

- [x] 2.1 Add `src/app/api/projects/[id]/duplicate/route.ts` `POST` handler: `authenticateRequest`, load source project `{ id, userId }` with its tasks (404 if not found), filter tasks to `status !== "completed"`, then in a `prisma.$transaction` create the new project (name from body or `Copy of <name>`, copy description+color, status active) and create each duplicated task via the helper; return the project with `_count.tasks`
- [x] 2.2 Define `LOG_SOURCE`, use the `prisma` singleton and `logger`, await `params` (Next 15)

## 3. Store action (green)

- [x] 3.1 Add `duplicateProject(id, name)` to `src/store/project.ts` that POSTs to `/api/projects/:id/duplicate` and prepends the returned project to `projects`

## 4. Sidebar UI (green)

- [x] 4.1 Add `src/components/projects/DuplicateProjectDialog.tsx` - a Dialog with a single name input (default `Copy of <name>`) and a Duplicate button that calls `duplicateProject` and shows a success/error toast
- [x] 4.2 Add a "Duplicate" icon button to each `ProjectItem` row in `src/components/projects/ProjectSidebar.tsx` (next to Edit) that opens the dialog for that project; wire state in `ProjectSidebar`

## 5. Local gate

- [x] 5.1 `npm run test:unit` passes (new suite 9/9 green; the only failing suites are the pre-existing, unrelated `google-field-mapper`/`google-provider.unit` timezone tests, byte-identical to `origin/main` and failing there too)
- [x] 5.2 `npm run type-check` passes
- [x] 5.3 `npm run lint` passes (zero warnings)
- [x] 5.4 Update `CHANGELOG.md` under `[unreleased]` with the user-facing addition

## 6. Review and finalize

- [ ] 6.1 Codex `adversarial-review` returns `approve`
  - Round 1 (`needs-attention`): (HIGH) filter the copied task relation by `userId` (not just the project owner) so a cross-owner task attached to the project cannot be cloned into the requester's account; (MEDIUM) refresh `useTaskStore` after duplication so the cloned tasks and derived counts appear immediately without a reload. Both fixed + covered by `src/store/__tests__/project-duplicate.test.ts`.
- [ ] 6.2 Archive the OpenSpec change
