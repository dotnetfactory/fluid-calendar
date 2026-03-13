# Tasks: OAuth Token Expiration Handling

## 1. Database Schema

- [ ] 1.1 Add `authStatus` field to ConnectedAccount model (String, default "valid")
- [ ] 1.2 Add `authError` field to ConnectedAccount model (String, nullable)
- [ ] 1.3 Add `authErrorAt` field to ConnectedAccount model (DateTime, nullable)
- [ ] 1.4 Create and run Prisma migration
- [ ] 1.5 Verify migration works in development

## 2. Token Manager Core Logic

- [ ] 2.1 Add `TokenRefreshError` type for error classification
- [ ] 2.2 Add `TokenRefreshResult` interface for structured returns
- [ ] 2.3 Create `classifyRefreshError()` helper function
- [ ] 2.4 Update `refreshGoogleTokens()` to return `TokenRefreshResult` and update authStatus
- [ ] 2.5 Update `refreshOutlookTokens()` to return `TokenRefreshResult` and update authStatus
- [ ] 2.6 Update `storeTokens()` to reset authStatus on successful token storage
- [ ] 2.7 Update `getGoogleCalendarClient()` to handle new return type

## 3. API Routes

- [ ] 3.1 Update `/api/calendar/google/route.ts` PUT to return structured AUTH_REQUIRED error
- [ ] 3.2 Update `/api/calendar/outlook/sync/route.ts` PUT to return structured AUTH_REQUIRED error
- [ ] 3.3 Update `/api/accounts/route.ts` GET to include authStatus, authError, authErrorAt
- [ ] 3.4 Add auth status update on sync failure in both Google and Outlook routes

## 4. UI Components

- [ ] 4.1 Update ConnectedAccount interface in settings store to include auth fields
- [ ] 4.2 Add warning Badge to AccountManager for accounts with authStatus="needs_reauth"
- [ ] 4.3 Add Alert component with error message and Reconnect button
- [ ] 4.4 Implement handleReconnect() function for each provider type
- [ ] 4.5 Update syncFeed() in calendar store to handle AUTH_REQUIRED response
- [ ] 4.6 Add toast notification when sync fails due to auth error

## 5. Background Job

- [ ] 5.1 Add `TOKEN_HEALTH` to QUEUE_NAMES in queues/index.ts
- [ ] 5.2 Add `TokenHealthJobData` interface
- [ ] 5.3 Create `tokenHealthQueue` with default options
- [ ] 5.4 Add `addTokenHealthJob()` helper function
- [ ] 5.5 Create `TokenHealthProcessor` class extending BaseProcessor
- [ ] 5.6 Implement token validation logic (check expiring tokens, attempt refresh)
- [ ] 5.7 Register processor in worker.ts
- [ ] 5.8 Add cron schedule for every 6 hours in worker.ts

## 6. Verification

- [ ] 6.1 Run `npm run type-check` - no errors
- [ ] 6.2 Run `npm run lint` - no warnings
- [ ] 6.3 Run `npm run build` - successful
- [ ] 6.4 Manual test: Connect Google account, revoke in Google settings, trigger sync
- [ ] 6.5 Manual test: Verify UI shows error badge and reconnect works
- [ ] 6.6 Manual test: Verify background job runs and marks accounts correctly
