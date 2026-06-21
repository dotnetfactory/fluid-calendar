## Why

Personal Microsoft accounts (outlook.com / hotmail.com / live.com, and Microsoft 365 Personal/Family) cannot connect as Outlook calendar accounts (issue #97). The OAuth sign-in itself succeeds, but FluidCalendar then redirects to `/settings?error=profile-fetch-failed`. The reporter confirmed Google personal accounts work fine, the failure persists on the latest build, and it also reproduces in the closed beta.

Root cause: the Outlook connect callback (`src/app/api/calendar/outlook/route.ts`) reads the account's email from the Microsoft Graph `/me` `mail` field and rejects the profile when `mail` is falsy. For personal Microsoft accounts the Graph `/me` `mail` attribute is commonly `null` (it is only reliably populated for Exchange Online / work-or-school mailboxes); the address for personal accounts lives in `userPrincipalName`. So a valid personal account is wrongly treated as "profile fetch failed" and never stored.

Separately, the reporter first hit a `redirect_uri` mismatch (the rendered Microsoft error screen) because the setup documentation lists the wrong Outlook redirect URI. The `README.md` Outlook section and `docs/_old/outlook.md` tell users to register `/api/auth/callback/azure-ad` (and a `/api/calendar/outlook/callback` variant), but the actual callback route the app uses is `/api/calendar/outlook`. The reporter self-diagnosed this ("Documentation appears to be incorrect ... Correct URI: .../api/calendar/outlook"). The in-app System Settings instructions already show the correct path; only the docs are wrong.

## What Changes

- **Code fix:** In the Outlook connect callback, derive the account email from `userProfile.mail` and fall back to `userProfile.userPrincipalName` when `mail` is missing. Only treat the profile as failed when neither yields an email. This lets personal Microsoft accounts connect while leaving work/school accounts unchanged.
- **Docs fix:** Correct the Outlook redirect URI in `README.md` (the Microsoft Outlook Setup section) and in `docs/_old/outlook.md` to the actual callback path `/api/calendar/outlook`, matching what the in-app System Settings panel already shows.
- No schema change, no new dependency, no change to scopes or token handling.

## Capabilities

### New Capabilities

- `outlook-account-connect`: Connecting a Microsoft (Outlook) account to FluidCalendar via the `/api/calendar/outlook` OAuth callback - which Graph profile field identifies the account, and which redirect URI self-hosters must register.

### Modified Capabilities

<!-- None: no existing spec covers Outlook account connect. -->

## Impact

- `src/app/api/calendar/outlook/route.ts` (email resolution in the connect callback).
- `README.md` (Microsoft Outlook Setup redirect URI).
- `docs/_old/outlook.md` (redirect URI line).
- `CHANGELOG.md` (`[unreleased]` entry).
- No API surface, schema, or scope changes.
