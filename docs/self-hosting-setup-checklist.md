# FluidCalendar Self-Hosting Setup Checklist

Use this checklist before opening an issue or buying a setup review. It focuses on the failure points that most often block a working FluidCalendar install.

## 1. Base App

- `NEXTAUTH_URL` matches the exact URL users open in the browser.
- `NEXTAUTH_SECRET` is set to a long random value and is the same across restarts.
- `DATABASE_URL` points to the running Postgres database, not a local placeholder.
- The app process can run migrations and write to the database.
- The deployment exposes the same port your reverse proxy routes to.

## 2. Google Calendar

- Google Calendar API and Google People API are enabled in the same Google Cloud project.
- OAuth consent screen has the correct app name, support email, and developer contact.
- Both OAuth redirect URIs are registered on the deployed domain: `/api/auth/callback/google` (Google sign-in) and `/api/calendar/google` (calendar connect).
- `NEXTAUTH_URL` (not `NEXT_PUBLIC_APP_URL`) matches that domain - it drives the OAuth redirect host. Bare private IPs and `.local` hostnames are rejected by Google; use `localhost` or a public domain.
- Required scopes are configured, including calendar read/write and user info.
- Test users are added if the OAuth app is still in testing mode.

## 3. Outlook Calendar

- Azure app registration supports the account type you expect to use (include personal Microsoft accounts if you connect outlook.com / hotmail.com / Microsoft 365 Personal/Family).
- Redirect URI matches `/api/calendar/outlook` on the deployed domain (this is the exact callback path FluidCalendar uses; no trailing slash, and not a NextAuth `azure-ad` callback path).
- Microsoft Graph delegated permissions include calendar, task, profile, and offline access permissions.
- The client secret value, not the secret ID, is copied into the app config.
- Tenant ID is set only when you want to restrict login to one tenant.

## 4. Production Readiness

- Public URL uses HTTPS before testing OAuth callbacks.
- Logs are enabled for app startup, auth callbacks, and calendar sync requests.
- Backups exist for Postgres before importing real calendar data.
- Environment values are stored in your host's secret manager, not committed to git.
- You can restart the app and still log in with the same account.

## Paid Self-Hosting Review

If you want a focused second pass, buy the $12 setup review:

https://buy.stripe.com/3cI9AS2799EYgx577zaMU04

The checkout asks for your repo, deploy URL, or setup notes plus the main blocker. Share only public configuration, screenshots, logs, or redacted snippets. Do not send secrets, private OAuth credentials, database passwords, or production tokens.
