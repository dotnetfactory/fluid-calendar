## Context

The Outlook connect callback exchanges the OAuth code for tokens, then fetches the user's Microsoft Graph profile to learn which email to key the stored account under:

```ts
const userProfile = await outlookService.getUserProfile(); // GET /me
if (!userProfile || !userProfile.mail) {
  // -> /settings?error=profile-fetch-failed
}
await tokenManager.storeTokens("OUTLOOK", userProfile.mail, { ... }, userId);
```

`getUserProfile()` returns the raw Graph `/me` object typed as `MSGraphUser { id, displayName, mail, userPrincipalName }`.

## The personal-account problem

Microsoft Graph populates `mail` only for mailboxes provisioned in Exchange Online (work/school tenants). For **personal** Microsoft accounts (outlook.com, hotmail.com, live.com, M365 Personal/Family) `/me` typically returns `mail: null` and carries the address in `userPrincipalName` instead. The current `!userProfile.mail` guard therefore rejects every valid personal account as `profile-fetch-failed`, even though authentication succeeded - exactly the symptom in issue #97. Google's equivalent flow works because the Google userinfo `email` is always present.

## Decision

Resolve the account email as `userProfile.mail ?? userProfile.userPrincipalName` and only fail when neither is present.

- For work/school accounts `mail` is set, so behavior is unchanged (still keyed by `mail`).
- For personal accounts `mail` is null but `userPrincipalName` holds the email, so the account connects and is stored under that address.
- `userPrincipalName` is the same identity Microsoft uses elsewhere and is stable, so it is a safe account key. (For the rare guest/UPN-suffix edge cases, `mail` - when present - still wins, preserving the prior key.)

The resolved email is used in two places (the guard and the `storeTokens` call); compute it once into a local `const email` and use it for both so they cannot diverge. Keep the existing `userProfile == null` guard. Keep the `try/catch` that maps a thrown Graph error to `profile-failed` (distinct from the empty-profile `profile-fetch-failed`).

### Alternatives considered

- *Request `mail` via a different Graph call / `$select`*: does not help - personal accounts simply have no `mail`; `userPrincipalName` is the documented fallback.
- *Always key on `userPrincipalName`*: would change the stored key for existing work/school accounts (potential duplicate accounts on reconnect). Preferring `mail` when present avoids that regression.

## Documentation fix

The redirect URI the app actually uses is built in the callback as `${NEXTAUTH_URL}/api/calendar/outlook`. The docs must register exactly that path:

- `README.md` Microsoft Outlook Setup currently lists `…/api/auth/callback/azure-ad` (the NextAuth Azure-AD sign-in path, which this app does not use for Outlook calendar connect) - correct it to `…/api/calendar/outlook` for both dev and production examples.
- `docs/_old/outlook.md` lists `…/api/calendar/outlook/callback` (extra `/callback`) - correct it to `…/api/calendar/outlook`.
- The in-app `SystemSettings.tsx` already renders `{window.location.origin}/api/calendar/outlook` correctly - no change needed there.

## Testing

- Unit-test the email-resolution logic directly (pure function over a profile shape): `mail` present -> use `mail`; `mail` null but `userPrincipalName` present -> use `userPrincipalName`; both absent -> treated as failure. This pins the behavior without spinning up the full Next.js route/Graph client.
- A docs assertion test reads `README.md` and asserts the Outlook section lists `/api/calendar/outlook` and no longer instructs `…/api/auth/callback/azure-ad`.

## Risks

- Low blast radius: a null-coalescing fallback plus doc strings. Work/school accounts keep their existing `mail` key. No schema or token-format change.
