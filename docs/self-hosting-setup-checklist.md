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
- OAuth redirect URI matches `/api/calendar/google` on the deployed domain.
- Required scopes are configured, including calendar read/write and user info.
- Test users are added if the OAuth app is still in testing mode.

## 3. Outlook Calendar

- Azure app registration supports the account type you expect to use.
- Redirect URI matches `/api/auth/callback/azure-ad` on the deployed domain.
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
