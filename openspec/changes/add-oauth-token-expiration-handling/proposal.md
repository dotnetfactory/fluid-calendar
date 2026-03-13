# Change: Add OAuth Token Expiration Handling

## Why

When OAuth tokens expire or are revoked (e.g., Google's `invalid_grant` error), the system silently fails and users have no visibility into why their calendars aren't syncing. This causes confusion and support burden, as users cannot self-diagnose or fix the issue without guidance.

Currently:
- TokenManager returns `null` on refresh failures with no error classification
- No distinction between permanent errors (token revoked) vs temporary errors (network issues)
- ConnectedAccount has no status tracking fields
- Users see generic "Failed to sync" errors with no actionable guidance
- No proactive detection - issues only discovered when sync fails

## What Changes

- **Database Schema**: Add `authStatus`, `authError`, and `authErrorAt` fields to ConnectedAccount model
- **Token Management**: Classify errors as permanent (needs reauth) vs temporary (retry later)
- **API Responses**: Return structured `AUTH_REQUIRED` error codes for auth failures
- **UI Notifications**: Show warning badges on accounts needing reconnection with "Reconnect" button
- **Background Job**: Proactive token health checks every 6 hours to catch issues before users hit them

## Impact

- **Affected models**: ConnectedAccount (schema change)
- **Affected code**:
  - `src/lib/token-manager.ts` - Error classification and status updates
  - `src/app/api/calendar/google/route.ts` - Structured error responses
  - `src/app/api/calendar/outlook/sync/route.ts` - Structured error responses
  - `src/app/api/accounts/route.ts` - Include auth status in response
  - `src/components/settings/AccountManager.tsx` - UI for auth status display
  - `src/store/calendar.ts` - Handle AUTH_REQUIRED in sync
  - `src/saas/jobs/` - New token health check job
- **Migration required**: Yes, adding 3 nullable fields to ConnectedAccount
- **Breaking changes**: None (additive only)
