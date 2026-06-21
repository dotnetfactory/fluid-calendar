## 1. Tests (write first, watch them fail)

- [x] 1.1 Add a Jest unit test for the email-resolution helper: `mail` present -> returns `mail`; `mail` null/empty but `userPrincipalName` present -> returns `userPrincipalName`; both absent -> returns null (signals profile failure)
- [x] 1.2 Add a Jest test that reads `README.md` and asserts the Microsoft Outlook Setup section lists `/api/calendar/outlook` and does not instruct `/api/auth/callback/azure-ad`

## 2. Code fix

- [x] 2.1 Add a small exported helper that resolves the account email from a `{ mail, userPrincipalName }` profile (`mail ?? userPrincipalName`, empty-string-safe)
- [x] 2.2 Update `src/app/api/calendar/outlook/route.ts` to use the helper: compute `email` once, redirect to `profile-fetch-failed` only when it is empty, and pass `email` to `tokenManager.storeTokens`

## 3. Tenant-optional connect

- [x] 3.0a Add Jest tests asserting integration-status reports Outlook configured with client id + secret and no tenant id, configured via the `AZURE_AD_*` env fallback, and not configured when id/secret missing
- [x] 3.0b Compute Outlook (and Google) configured status from `getOutlookCredentials`/`getGoogleCredentials` in `src/app/api/integration-status/route.ts` - no tenant ID required, and the documented env-var fallback is honored - so the Connect Outlook button is enabled for the documented personal-account setup

## 3b. Docs

- [x] 3.1 Correct the redirect URI in the `README.md` Microsoft Outlook Setup section to `/api/calendar/outlook` (dev + production examples)
- [x] 3.2 Correct the redirect URI in `docs/_old/outlook.md` to `/api/calendar/outlook` (drop the trailing `/callback`)
- [x] 3.3 Correct the redirect URI in `docs/self-hosting-setup-checklist.md` to `/api/calendar/outlook` and broaden the docs test to guard all setup docs

## 4. Changelog

- [x] 4.1 Add a `CHANGELOG.md` entry under `[unreleased]` for the personal-Outlook connect fix and corrected redirect URI docs

## 5. Verify

- [x] 5.1 Run the local gate (unit tests + type-check + lint) and confirm green
