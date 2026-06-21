## 1. Expose the version to the client

- [x] 1.1 Add `env: { NEXT_PUBLIC_APP_VERSION: require("./package.json").version }` to `next.config.js`

## 2. Pure, unit-testable version helpers (TDD)

- [x] 2.1 Add `src/lib/version.ts` with `getAppVersion()` (reads `NEXT_PUBLIC_APP_VERSION`, falls back when empty) and `getVersionGithubUrl()` (always the repo root, so the link never 404s - a release-tag link was tried first but rejected per Codex review because `0.1.0` has no published tag)
- [x] 2.2 Add `src/__tests__/version.test.ts` covering: env set -> returns it; env empty/unset/whitespace -> fallback; trimming; URL always the repo root regardless of version
- [x] 2.3 Run `npm run test:unit` and confirm the new tests fail before the helper exists / behaves correctly (red) - confirmed module-not-found red, then green

## 3. VersionBadge component + footer (green)

- [x] 3.1 Add `src/components/navigation/VersionBadge.tsx` rendering the version as an external GitHub anchor (`target="_blank" rel="noopener noreferrer"`), using the helpers
- [x] 3.2 Render a minimal `<footer>` containing `<VersionBadge />` in `src/app/(common)/layout.tsx` so the version appears on every authenticated page
- [x] 3.2a Also add the version to the public homepage footer (`src/app/(open)/page.open.tsx`), the one user-visible route outside `(common)`, so "every page" is fully covered (per Codex review)
- [x] 3.2b Also add the version link to the root failure pages (`src/app/not-found.tsx`, `src/app/error.tsx`), which render their own `<html>/<body>` outside all layouts, so even 404/error screens show the version (per Codex review)
- [x] 3.3 Run `npm run test:unit` and confirm the new suite passes (green) - version suite 10/10 green; the only failing suites are the pre-existing, unrelated `google-*` tests that are byte-identical to `origin/main` and fail there too

## 4. Local gate

- [x] 4.1 `npm run type-check` passes
- [x] 4.2 `npm run lint` passes (zero warnings)
- [x] 4.3 Update `CHANGELOG.md` under `[unreleased]` with the user-facing addition

## 5. Review and finalize

- [x] 5.1 Codex `adversarial-review` returns `approve` (verdict: approve, 0 findings; the only note was the known jest read-only sandbox cache-write phantom, confirmed green in the writable env)
- [x] 5.2 Archive the OpenSpec change
