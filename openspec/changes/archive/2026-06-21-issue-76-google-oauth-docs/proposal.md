## Why

Self-hosters repeatedly fail to connect Google Calendar (issue #76) because the setup instructions are inconsistent and incomplete. The README and the in-app System Settings panel describe the Google Cloud OAuth setup differently ("the directions on the app vs the directions on the GitHub page are different"), and neither documents the `/api/auth/callback/google` redirect URI that Google sign-in actually requires - the URI the maintainer's own working Google Cloud console (and a contributor's confirmed recipe) lists alongside `/api/calendar/google`. Users also hit `redirect_uri_mismatch` / "Invalid Redirect" errors because the docs do not explain that the redirect host comes from `NEXTAUTH_URL` (not `NEXT_PUBLIC_APP_URL`) and that Google rejects bare private IPs.

## What Changes

- Document **both** required Google OAuth redirect URIs in the README and in the in-app System Settings panel: `/api/auth/callback/google` (Google sign-in) and `/api/calendar/google` (calendar connect). Today both places list only the calendar one.
- Align the README Google setup steps with the in-app instructions so they describe the same redirect URIs and the same flow (no more "App vs GitHub" mismatch).
- Add a short troubleshooting note covering the two most common failures from the issue thread: (a) `NEXTAUTH_URL` must equal the public URL the browser uses (it drives the OAuth redirect; `NEXT_PUBLIC_APP_URL` does not), and (b) Google rejects bare private IPs/`.local` hostnames for redirect URIs - use `localhost` for local dev or a public domain.
- No code-behavior change: the auth route already derives the redirect from `NEXTAUTH_URL`; this change is documentation + the in-app instruction text only.

## Capabilities

### New Capabilities

- `google-oauth-setup-docs`: The user-facing instructions (README + in-app System Settings) for configuring Google OAuth credentials to connect Google Calendar, including which redirect URIs to register and how the redirect host is derived.

### Modified Capabilities

<!-- None: no existing spec covers these setup instructions. -->

## Impact

- `README.md` (Google Calendar setup section).
- `src/components/settings/SystemSettings.tsx` (Google Calendar Integration instruction list).
- `docs/self-hosting-setup-checklist.md` (Google Calendar section - add the auth callback redirect URI).
- No API, schema, or runtime-behavior change. No new dependencies.
