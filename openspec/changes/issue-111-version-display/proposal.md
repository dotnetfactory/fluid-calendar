## Why

The application does not surface its version number anywhere in the UI (GitHub issue #111). The version (`0.1.0`) lives only in `package.json` and is never exposed to the client, so a user cannot tell which release they are running or jump to the project's source. Showing the version on every page - and making it a link back to the GitHub project - gives users a quick way to identify their build and find the source/releases.

## What Changes

- Inject the `package.json` version into the client bundle at build time via a `NEXT_PUBLIC_APP_VERSION` env value defined in `next.config.js`, so the displayed version always tracks the package version with no manual sync.
- Add a pure, unit-testable helper module (`src/lib/version.ts`) that resolves the app version string (falling back to a sane default when the env var is absent) and builds the GitHub link target for that version. The repo's Jest env is Node-only and matches `*.test.ts`, so the linkable logic must live in a `.ts` module to be covered by tests; the React component stays a thin consumer.
- Add a small `VersionBadge` component that renders the version as an anchor (`<a>`) opening the project's GitHub page in a new tab. It is rendered in a minimal footer in the shared authenticated layout so it appears on all pages.

No data model, API, or scheduling behavior changes. The feature is additive and open-source-friendly (no SAAS gating needed).

## Capabilities

### New Capabilities
- `app-version-display`: Surfacing the application version in the UI on every page as a link to the project's GitHub page.

### Modified Capabilities
<!-- None: no existing spec defines this behavior yet. -->

## Impact

- `next.config.js` - add an `env.NEXT_PUBLIC_APP_VERSION` value read from `package.json` at config-eval time.
- New `src/lib/version.ts` - pure helpers: `getAppVersion()` and `getVersionGithubUrl()`.
- New `src/components/navigation/VersionBadge.tsx` - thin client component rendering the version as a GitHub link.
- `src/app/(common)/layout.tsx` - render a small footer containing `<VersionBadge />` so the version shows on every authenticated page.
- New unit test under `src/__tests__/` covering the version-resolution and URL helpers.
- `CHANGELOG.md` - note the user-facing addition under `[unreleased]`.
