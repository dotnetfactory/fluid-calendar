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
 * Build the GitHub link target for a version.
 *
 * For a real released version this points at the matching release tag
 * (`.../releases/tag/v<version>`); for the fallback/unknown version it points
 * at the repository root. Both are "the GitHub page" for the project.
 *
 * @param version - the version to link to; defaults to {@link getAppVersion}.
 */
export function getVersionGithubUrl(version: string = getAppVersion()): string {
  const normalized = version.trim();
  if (!normalized || normalized === FALLBACK_APP_VERSION) {
    return GITHUB_REPO_URL;
  }
  const tag = normalized.startsWith("v") ? normalized : `v${normalized}`;
  return `${GITHUB_REPO_URL}/releases/tag/${tag}`;
}
