## Context

The version string exists only in `package.json` (`"version": "0.1.0"`) and is not exposed to the client anywhere. All authenticated pages render through `src/app/(common)/layout.tsx`, a client component that renders `<AppNav />` (a top navbar) and a `<main className="relative flex-1">` inside a `flex min-h-screen flex-col` column. There is no footer component anywhere in `src/components`.

The repo reads build-time configuration through `NEXT_PUBLIC_*` env vars (e.g. `NEXT_PUBLIC_ENABLE_SAAS_FEATURES`, `NEXT_PUBLIC_APP_URL`). `next.config.js` does not currently set an `env` block; it only computes `pageExtensions` from the SAAS flag. The canonical GitHub URL is `https://github.com/dotnetfactory/fluid-calendar` (already referenced in `src/app/(open)/page.open.tsx`).

The Jest config is Node-env with `testMatch: src/**/__tests__/**/*.test.ts` and no jsdom, so `.tsx` components cannot be rendered in tests; only pure `.ts` logic is unit-testable.

## Goals / Non-Goals

Goals:
- Show the app version on every page.
- Make the version a link that takes the user to the project's GitHub page.
- Keep the displayed version automatically in sync with `package.json` (no second place to bump).
- Make the version-resolution and link-building logic unit-testable.

Non-Goals:
- No new settings, API route, or persisted state.
- No SAAS-vs-OSS divergence (the version + GitHub link are identical in both builds, so no `.saas`/`.open` split).
- No redesign of the navbar; the footer is intentionally minimal and unobtrusive.

## Decisions

### Decision: Inject the version via `next.config.js` `env`, sourced from `package.json`

Add `env: { NEXT_PUBLIC_APP_VERSION: require("./package.json").version }` to the Next config. `NEXT_PUBLIC_`-prefixed env values are inlined into the client bundle by Next at build time, so the footer can read `process.env.NEXT_PUBLIC_APP_VERSION` on the client. Reading it from `package.json` at config-eval time means the single source of truth for the version stays `package.json` - bumping the package version updates the UI automatically.

Alternative considered: a hardcoded constant in a `version.ts` file. Rejected because it duplicates the version and will silently drift from `package.json`.

Alternative considered: importing `package.json` directly into a client component. Rejected - bundling the whole `package.json` into the client and relying on JSON import interop is heavier and less explicit than a single env value.

### Decision: Put version-resolution + URL logic in a pure `src/lib/version.ts`

The Node-only Jest env cannot render `.tsx`, so to get test coverage the testable logic lives in a plain module:
- `getAppVersion(): string` - returns `process.env.NEXT_PUBLIC_APP_VERSION` when set and non-empty, else a `"0.0.0"`-style fallback so the UI never renders an empty/`undefined` version.
- `getVersionGithubUrl(): string` - returns the GitHub URL the badge links to: always the repository root (`https://github.com/dotnetfactory/fluid-calendar`). A per-version `/releases/tag/v<version>` link was deliberately rejected because not every `package.json` version has a published GitHub release tag (e.g. `0.1.0` has no tag, while the repo's actual tags start at `v1.0.0`), so a tag-based link would 404 for the current build. The repo root is unambiguously "the github page" the issue asks for and always resolves.

The `VersionBadge.tsx` component is a thin consumer of these helpers; the test imports the helpers directly.

### Decision: Render a minimal footer in the `(common)` layout

The issue says "at the footer or somewhere" and "on all the pages". The single chokepoint for all authenticated pages is `(common)/layout.tsx`. Add a small `<footer>` after `<main>` (inside the `flex min-h-screen flex-col` column so it sits at the bottom) containing `<VersionBadge />`, right-aligned, muted, small text. This guarantees the version is present on every page without touching each page or restructuring the navbar.

The badge is an `<a target="_blank" rel="noopener noreferrer">` (a plain anchor, not Next `<Link>`, since it points to an external site), styled with muted text and a hover state consistent with the navbar's other muted controls.

## Risks / Trade-offs

- Risk: `next.config.js` is also evaluated for the worker/standalone build. `require("./package.json").version` is a plain synchronous read with no side effects, so it is safe in every config evaluation.
- Trade-off: the link goes to the repository root rather than a version-specific page. This is intentional - it guarantees the link always resolves (a tag-based link 404s for versions with no published release, including the current `0.1.0`) and matches the issue's request for "the github page".
- Trade-off: a footer adds a small amount of vertical chrome. Kept to a single short line of small muted text to stay unobtrusive.

## Migration Plan

None. Additive UI plus a build-time env value; no data, schema, or API migration.

## Open Questions

- None. The badge links to the repo root in all cases (see Decisions). A specific release-tag link was considered and rejected because it would 404 for versions with no published GitHub release.
