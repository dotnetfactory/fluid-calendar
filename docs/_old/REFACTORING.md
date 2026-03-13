# Multi-Account Calendar Integration Refactoring Plan

## Current Architecture

The current implementation has several limitations:

- Token management is session-based
- Single account per provider assumption
- Calendar feeds track provider types (LOCAL/GOOGLE/OUTLOOK) but aren't linked to specific provider accounts
- Settings are not designed for multiple accounts

## Goals

1. Support multiple accounts per provider (Google, and future Outlook support)
2. Maintain single-user nature of the app
3. Manage accounts and their calendars through settings
4. Keep existing functionality intact
5. Prepare architecture for future provider additions

## Database Changes

### Update Account Model

```prisma
model ConnectedAccount {
  id            String   @id @default(cuid())
  provider      String   // "GOOGLE" | "OUTLOOK"
  email         String
  accessToken   String
  refreshToken  String?
  expiresAt     DateTime
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  calendars     CalendarFeed[]

  @@unique([provider, email])
}
```

### Update CalendarFeed Model

```prisma
model CalendarFeed {
  // Existing fields...
  accountId    String?
  account      ConnectedAccount? @relation(fields: [accountId], references: [id])
}
```

## Code Changes

### 1. Token Management

- Create new token management service (`src/lib/token-manager.ts`)
  - Handle token storage/retrieval from database
  - Token refresh logic per account
  - Token validation

### 2. Calendar Integration

- Update Google Calendar client creation (`src/lib/google-calendar.ts`)
  - Accept accountId instead of tokens
  - Fetch tokens using token manager
  - Update all calendar operations to work with accountId

### 3. Settings Management

- Add account management to settings store
  - List connected accounts
  - Add/remove accounts
  - Select calendars per account
- Update settings UI components
  - Account connection interface
  - Calendar selection per account
  - Account removal

### 4. API Updates

- Update calendar API routes
  - Accept accountId in requests
  - Handle multiple accounts in calendar operations
- Add account management endpoints
  - Connect new account
  - Remove account
  - List accounts
  - Refresh account calendars

## Implementation Steps

1. **Database Migration**

   - Create ConnectedAccount table
   - Update CalendarFeed table
   - Create migration script for existing data

2. **Token Management**

   - Implement token manager service
   - Add token refresh logic
   - Update existing token usage

3. **Calendar Integration**

   - Update Google Calendar client
   - Modify calendar operations
   - Add account-specific calendar operations

4. **Settings Updates**

   - Extend settings store
   - Create account management UI
   - Update calendar selection UI

5. **API Changes**

   - Add account management endpoints
   - Update calendar endpoints
   - Add migration API for existing setup

6. **Testing**
   - Test multiple account scenarios
   - Verify calendar operations
   - Test token refresh
   - Validate settings management

## Security Considerations

1. Token Storage

   - Encrypt sensitive data in database
   - Implement secure token refresh
   - Handle token revocation

2. Account Management
   - Validate account ownership
   - Secure account removal
   - Handle provider API limits

## Future Considerations

1. Outlook Integration

   - Similar account structure
   - Provider-specific token management
   - Calendar sync implementation

2. Other Providers

   - Extensible provider interface
   - Generic account management
   - Provider-specific settings

3. Performance
   - Efficient calendar sync
   - Token refresh optimization
   - Event aggregation strategy

Would you like me to proceed with implementing any specific part of this plan?
