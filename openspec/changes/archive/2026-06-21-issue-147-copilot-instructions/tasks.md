## 1. Author the instructions file

- [x] 1.1 Create `.github/copilot-instructions.md` with a short project overview grounded in `CLAUDE.md` / `openspec/project.md`
- [x] 1.2 Document setup (`npm install --legacy-peer-deps`) and the build/dev/test/lint/type-check commands, including the zero-warning lint gate
- [x] 1.3 Document the architecture overview (local-first sync, scheduling engine, task sync, background jobs)
- [x] 1.4 Document the SAAS vs open-source separation (`src/saas/`, `*.saas`/`*.open` extensions, no `.gitignore` for SAAS files)
- [x] 1.5 Document core code-style conventions (prisma singleton, date helpers, logger + `LOG_SOURCE`, Next 15 async `params`, admin middleware, JSX escaping, no em dashes, `CHANGELOG.md` updates)

## 2. Verify

- [x] 2.1 Add/adjust a unit test asserting `.github/copilot-instructions.md` exists, is non-empty, and contains the load-bearing markers (install command, gate, SAAS/OSS rules, prisma/date/logger conventions)
- [x] 2.2 Run the local gate (`npm run test:unit`, `npm run type-check`, `npm run lint`) and confirm the new test passes and lint is clean
- [x] 2.3 Cross-check the file against `CLAUDE.md` / `openspec/project.md` for consistency
- [x] 2.4 Update `CHANGELOG.md` under `[Unreleased]` noting the new Copilot instructions file
