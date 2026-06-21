## 1. Tests (write first, watch them fail)

- [x] 1.1 Add a Jest test that reads `README.md` and asserts the Google setup section lists both `/api/calendar/google` and `/api/auth/callback/google` as authorized redirect URIs
- [x] 1.2 Extend the test to assert the README states `NEXTAUTH_URL` must match the public URL and drives the OAuth redirect (and is not `NEXT_PUBLIC_APP_URL`)
- [x] 1.3 Extend the test to assert the README warns that bare private IPs / `.local` hosts are rejected by Google and to use `localhost` or a public domain
- [x] 1.4 Add a Jest test that reads `SystemSettings.tsx` and asserts the Google Calendar Integration instructions reference both redirect URI paths and compose them from `window.location.origin` (no hardcoded host)

## 2. README updates

- [x] 2.1 Update the README Google "Authorized redirect URIs" list to include both `/api/auth/callback/google` and `/api/calendar/google` (dev + production examples)
- [x] 2.2 Add a concise troubleshooting note: `NEXTAUTH_URL` must equal the browser-facing public URL (drives the redirect host); private IPs / `.local` are rejected by Google - use `localhost` or a public domain

## 3. In-app System Settings updates

- [x] 3.1 Update the Google Calendar Integration instruction list in `SystemSettings.tsx` to show both redirect URIs, each built from `window.location.origin`

## 4. Supporting docs + changelog

- [x] 4.1 Add the `/api/auth/callback/google` redirect URI to the Google section of `docs/self-hosting-setup-checklist.md`
- [x] 4.2 Add a `CHANGELOG.md` entry under `[unreleased]` for the corrected Google OAuth setup docs

## 5. Verify

- [x] 5.1 Run the local gate (unit tests + type-check + lint) and confirm green
