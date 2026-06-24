/**
 * Application version helpers.
 *
 * The version is sourced from `package.json` and injected into the client
 * bundle as `NEXT_PUBLIC_APP_VERSION` via `next.config.js`, so the displayed
 * version always tracks the package version with no manual sync. These helpers
 * are pure so they can be unit-tested in the repo's Node-only Jest env (which
 * cannot render `.tsx`), while the UI component stays a thin consumer.
 */

/** Canonical GitHub page for the project. */
export const GITHUB_REPO_URL = "https://github.com/dotnetfactory/fluid-calendar";

/** Shown when the version is unavailable at runtime, so the UI is never empty. */
export const FALLBACK_APP_VERSION = "0.0.0";

/**
 * Resolve the application version for display.
 *
 * Returns the (trimmed) `NEXT_PUBLIC_APP_VERSION` value when it is set and
 * non-empty, otherwise {@link FALLBACK_APP_VERSION}.
 */
export function getAppVersion(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_VERSION?.trim();
  return fromEnv ? fromEnv : FALLBACK_APP_VERSION;
}

/**
 * The GitHub link target for the displayed version.
 *
 * Always the repository root - "the GitHub page" the feature requires. A
 * per-version `/releases/tag/v<version>` link was deliberately avoided: not
 * every package version has a published GitHub release (e.g. `0.1.0` has no
 * tag), so a tag-based link would 404 for the current build.
 */
export function getVersionGithubUrl(): string {
  return GITHUB_REPO_URL;
}
