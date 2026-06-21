## 1. Tests (write first, watch them fail)

- [x] 1.1 Add a Jest unit test for the email-resolution helper: `mail` present -> returns `mail`; `mail` null/empty but `userPrincipalName` present -> returns `userPrincipalName`; both absent -> returns null (signals profile failure)
- [x] 1.2 Add a Jest test that reads `README.md` and asserts the Microsoft Outlook Setup section lists `/api/calendar/outlook` and does not instruct `/api/auth/callback/azure-ad`

## 2. Code fix

- [x] 2.1 Add a small exported helper that resolves the account email from a `{ mail, userPrincipalName }` profile (`mail ?? userPrincipalName`, empty-string-safe)
- [x] 2.2 Update `src/app/api/calendar/outlook/route.ts` to use the helper: compute `email` once, redirect to `profile-fetch-failed` only when it is empty, and pass `email` to `tokenManager.storeTokens`

## 3. Docs

- [x] 3.1 Correct the redirect URI in the `README.md` Microsoft Outlook Setup section to `/api/calendar/outlook` (dev + production examples)
- [x] 3.2 Correct the redirect URI in `docs/_old/outlook.md` to `/api/calendar/outlook` (drop the trailing `/callback`)

## 4. Changelog

- [x] 4.1 Add a `CHANGELOG.md` entry under `[unreleased]` for the personal-Outlook connect fix and corrected redirect URI docs

## 5. Verify

- [x] 5.1 Run the local gate (unit tests + type-check + lint) and confirm green
