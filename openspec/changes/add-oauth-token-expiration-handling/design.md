# Design: OAuth Token Expiration Handling

## Context

FluidCalendar integrates with Google Calendar, Outlook, and CalDAV providers using OAuth 2.0 tokens. These tokens can become invalid due to:
- User revoking app access in provider settings
- Refresh token expiration (Google apps in "testing" mode: 7 days)
- Password changes
- Prolonged inactivity (6+ months)
- Microsoft-specific errors (AADSTS codes)

Current behavior silently fails, returning `null` from token refresh without updating any state or notifying users.

## Goals / Non-Goals

**Goals:**
- Users can see which accounts need re-authentication
- Users can self-service reconnect without support intervention
- Proactive detection catches issues before sync failures
- Clear distinction between permanent and temporary failures

**Non-Goals:**
- Automatic token refresh retry loops (already exists)
- Sending email notifications for auth failures (future enhancement)
- Admin dashboard for monitoring auth failures across all users (future)

## Decisions

### Decision 1: String-based authStatus vs Enum

**Choice**: String field with values `"valid"` | `"needs_reauth"` | `"error"`

**Rationale**:
- Allows future extensibility without migrations
- Matches existing patterns in codebase (e.g., TaskProvider.error)
- Simpler than creating a new enum

**Alternatives considered:**
- Boolean `needsReauth` - Too limited, can't distinguish error types
- Prisma enum - Requires migration for each new status

### Decision 2: Error Classification Strategy

**Choice**: Classify errors based on error message/code patterns

```typescript
// Permanent errors (requires user action)
- Google: "invalid_grant", "token has been expired or revoked"
- Outlook: AADSTS50173, AADSTS700082, AADSTS50078, AADSTS50076

// Temporary errors (retry later)
- Network errors: ECONNREFUSED, timeout
- Server errors: 500, 503
```

**Rationale**: Provider-specific error codes are well-documented and stable

### Decision 3: Background Job Frequency

**Choice**: Every 6 hours

**Rationale**:
- Balance between early detection and API rate limits
- Google token refresh doesn't count against quota
- Outlook has generous limits for token operations
- Catches issues within same business day

**Alternatives considered:**
- Every hour - Too aggressive, unnecessary API calls
- Daily - Too slow, user may hit issue before detection

### Decision 4: UI Treatment

**Choice**: Inline alert with reconnect button in AccountManager

**Rationale**:
- Matches existing patterns (CalDAVAccountForm error display)
- Non-intrusive but visible
- Direct action available without navigation

**Alternatives considered:**
- Modal popup - Too disruptive
- Email notification - Out of scope, future enhancement
- Global banner - Too prominent for account-specific issue

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| False positives marking accounts as needs_reauth | Only mark on confirmed permanent errors, not network issues |
| Token health check causing rate limits | 6-hour interval, only check tokens expiring soon |
| Migration data issues | All new fields are nullable with safe defaults |
| Provider API changes | Error patterns documented, easy to update classification |

## Migration Plan

1. Create Prisma migration adding 3 nullable fields
2. Run migration - existing accounts get `authStatus = "valid"` by default
3. Deploy code changes
4. Background job starts validating existing accounts

**Rollback**: Remove migration (fields are nullable, no data loss)

## Open Questions

None - all design decisions have been made based on exploration.
