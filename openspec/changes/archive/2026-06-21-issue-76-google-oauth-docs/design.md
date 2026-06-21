## Context

Issue #76 collects ~10 reports of self-hosters unable to connect Google Calendar. The OAuth redirect host is already derived correctly in code from `NEXTAUTH_URL` (`src/app/api/calendar/google/auth/route.ts`), so there is no runtime bug to fix. The failures trace to three documentation problems:

1. README (`README.md` step 4) and the in-app System Settings panel (`SystemSettings.tsx`) describe the Google Cloud setup differently, so users do not know which to trust.
2. Neither documents the `/api/auth/callback/google` redirect URI used by Google **sign-in** (NextAuth). The maintainer's own working Google Cloud console (issue image) and a contributor's confirmed recipe both list it alongside `/api/calendar/google`.
3. Users set the wrong env var (`NEXT_PUBLIC_APP_URL`) or use a private IP / `.local` host, producing `redirect_uri_mismatch` / "Invalid Redirect" errors, with no docs explaining either pitfall.

## Goals / Non-Goals

**Goals:**
- README and in-app instructions agree on which redirect URIs to register.
- Both required redirect URIs (`/api/auth/callback/google` and `/api/calendar/google`) are documented in both places.
- Short, accurate troubleshooting guidance for the two common failures (`NEXTAUTH_URL`; private IP/`.local`).

**Non-Goals:**
- No change to OAuth runtime behavior or the auth route.
- No screencast/video (out of scope; the issue asked "a video, or at least step by step" - we deliver the corrected step-by-step).
- No change to the Outlook setup instructions beyond what already exists.

## Decisions

- **Document both redirect URIs rather than change code to need only one.** Google sign-in (NextAuth) and calendar connect genuinely use two different callback paths; the maintainer's working console proves both are required. Documenting the truth is lower-risk than re-architecting the OAuth flow under this support issue.
- **Keep the in-app panel using `window.location.origin`.** It already renders the correct host dynamically; we only add the second redirect URI and a note, so the app keeps "just working" regardless of deployment URL. Alternative (hardcoding example URLs in the app) was rejected - it would reintroduce the static-vs-dynamic confusion seen in the issue images.
- **Put the env-var/private-IP pitfalls in the README + self-hosting checklist, not the app panel.** The panel stays short; the README is where setup troubleshooting belongs and where the checklist already lives.

## Risks / Trade-offs

- [Docs drift again if the callback paths change] → Spec scenarios assert the exact path strings appear in both README and the app panel, so a future path change that misses a doc is catchable.
- [Over-promising on "video"] → We explicitly scope to corrected written steps; the issue's "or at least step by step" makes that acceptable.

## Migration Plan

Pure documentation/UI-copy change; ships with the next release. No data migration, no rollback concern (revert the commit if needed).
