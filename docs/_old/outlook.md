# Outlook Calendar Integration Implementation Plan

## Overview

This document outlines the implementation plan for adding Microsoft Outlook calendar support to FluidCalendar using the Microsoft Graph API. This integration will enable users to connect their Microsoft 365 and Outlook.com calendars, expanding the calendar integration options alongside Google Calendar and CalDAV support.

## Outlook Integration Details

The Outlook integration system will handle OAuth authentication, synchronization, and CRUD operations for Microsoft calendars. This component is responsible for:

### 1. Core Interfaces

```typescript
interface OutlookAccount {
  id: string;
  provider: "OUTLOOK";
  email: string;
  displayName: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  calendars: OutlookCalendar[];
}

interface OutlookCalendar {
  id: string;
  name: string;
  color?: string;
  canEdit: boolean;
  owner: string;
  hexColor?: string;
}

interface OutlookEvent {
  id: string;
  iCalUId?: string;
  subject: string;
  body?: {
    contentType: "text" | "html";
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
    address?: string;
  };
  attendees?: {
    emailAddress: {
      address: string;
      name: string;
    };
    type: "required" | "optional";
    status: {
      response: "none" | "accepted" | "tentative" | "declined";
    };
  }[];
  recurrence?: {
    pattern: any;
    range: any;
  };
}
```

### 2. Core Responsibilities

- **Authentication Management**

  - OAuth 2.0 flow
  - Token refresh handling
  - Permission scopes
  - Multi-tenant support
  - Token storage

- **Calendar Synchronization**

  - Delta query support
  - Batch operations
  - Change tracking
  - Conflict resolution
  - Error recovery

- **Event Management**

  - CRUD operations
  - Recurring events
  - Attendee management
  - Rich text support
  - Categories/tags

- **Security & Error Handling**
  - Token encryption
  - Rate limiting
  - Retry mechanisms
  - Error reporting
  - Quota management

### 3. Implementation Approach

```typescript
class OutlookServiceImpl implements CalendarService {
  constructor(
    private prisma: PrismaClient,
    private settings: SystemSettings
  ) {}

  async connect(code: string): Promise<OutlookAccount> {
    // 1. Exchange code for tokens
    // 2. Fetch user profile
    // 3. Discover calendars
    // 4. Store encrypted tokens
    // 5. Return account info
  }

  async sync(account: OutlookAccount): Promise<void> {
    // 1. Check token expiration
    // 2. Use delta query for changes
    // 3. Apply local changes
    // 4. Handle conflicts
    // 5. Update sync state
  }

  async createEvent(
    calendar: OutlookCalendar,
    event: CalendarEvent
  ): Promise<OutlookEvent> {
    // 1. Convert to Graph API format
    // 2. Create event
    // 3. Handle attendees
    // 4. Return created event
  }
}
```

### 4. Key Components

1. **Graph API Client**

   - Authentication flow
   - Token management
   - Request handling
   - Batch operations

2. **Sync Engine**

   ```typescript
   interface OutlookSyncEngine {
     getDeltaChanges(
       calendar: OutlookCalendar,
       deltaToken?: string
     ): Promise<{
       events: OutlookEvent[];
       deltaToken: string;
     }>;

     applyChanges(changes: OutlookChanges): Promise<void>;

     handleConflicts(
       local: OutlookEvent,
       remote: OutlookEvent
     ): Promise<OutlookEvent>;
   }
   ```

3. **Token Manager**
   ```typescript
   interface TokenManager {
     exchangeCode(code: string): Promise<TokenResponse>;
     refreshToken(refreshToken: string): Promise<TokenResponse>;
     encryptTokens(tokens: TokenResponse): string;
     decryptTokens(encrypted: string): TokenResponse;
   }
   ```

### 5. Edge Cases to Handle

- Token expiration during operations
- Rate limit exceeded
- Multi-calendar sync conflicts
- Timezone conversions
- Recurring event modifications
- Attendee responses
- Network interruptions
- Permission changes

## Implementation Status

### ✅ Phase 1: Foundation Setup (Completed)

- [x] Azure AD Configuration
  - [x] App registration
  - [x] Permission scopes
  - [x] Redirect URIs
  - [x] Token handling
- [x] Database Schema Updates
  - [x] Add Outlook account model (using existing ConnectedAccount)
  - [x] Add token storage (using existing fields)
  - [x] Add sync state table (using existing lastSync field)
- [x] Basic Graph API Client
  - [x] Authentication flow
  - [x] Calendar discovery
  - [x] Basic CRUD
  - [x] Token refresh handling

### ✅ Phase 2: Core Integration (Completed)

- [x] Calendar Integration
  - [x] Full CRUD support
  - [x] Recurring events
  - [x] Attendee management
  - [x] Categories support
- [x] Sync Engine
  - [x] Delta query implementation
  - [x] Batch operations
  - [x] Conflict resolution
  - [x] Error handling
- [x] UI Integration
  - [x] Account connection
  - [x] Calendar selection
  - [x] Sync status
  - [x] Error reporting

### 🚧 Phase 3: Advanced Features & Bug Fixes (In Progress)

- [ ] Enhanced Sync
  - [ ] Real-time updates
  - [ ] Webhook support
  - [x] Background sync
  - [ ] Offline support
- [ ] Rich Features
  - [ ] Meeting scheduling
  - [ ] Room booking
  - [ ] Resource management
  - [ ] Availability view
- [ ] Known Issues
  - [ ] Deleting single instance from recurring series sync issue
  - [ ] Calendar color customization
  - [ ] Calendar reordering in UI
  - [ ] RSVP functionality

## Next Implementation Steps

1. ✅ Database Schema (Completed)
2. ✅ Authentication Flow (Completed)
3. ✅ Basic Graph API Client (Completed)
4. ✅ Calendar Integration (Completed)
5. ✅ Sync Engine Implementation (Completed)
6. ✅ UI Integration (Completed)
7. Current Focus:
   - Fix recurring event deletion sync
   - Add calendar customization features
   - Implement RSVP functionality
   - Add real-time updates

## Technical Considerations

1. **Security**

   - Secure token storage
   - Scope management
   - Token refresh handling
   - Rate limit handling

2. **Performance**

   - Delta query usage
   - Batch operations
   - Caching strategy
   - Background sync

3. **Reliability**

   - Token refresh logic
   - Retry mechanisms
   - Error recovery
   - Conflict handling

4. **User Experience**
   - Simple OAuth flow
   - Clear permissions
   - Sync indicators
   - Error messaging

## Dependencies

1. **Required Libraries**

   - `@microsoft/microsoft-graph-client`
   - `@azure/msal-node`
   - `date-fns-tz`
   - `crypto-js`

2. **Development Tools**
   - Azure AD tenant
   - Test accounts
   - Graph Explorer
   - Postman collections

## Testing Strategy

1. **Unit Tests**

   - Auth flows
   - Token management
   - Event conversion
   - Error handling

2. **Integration Tests**

   - Graph API calls
   - Sync processes
   - Token refresh
   - Rate limiting

3. **End-to-End Tests**
   - Account connection
   - Calendar operations
   - Sync scenarios
   - Error recovery

## Documentation Requirements

1. **User Documentation**

   - Connection guide
   - Permission explanation
   - Troubleshooting steps
   - Feature overview

2. **Developer Documentation**
   - Graph API usage
   - Token management
   - Sync process
   - Extension points

## Azure AD Configuration

1. **App Registration**

   ```
   Application (client) ID: [Your Client ID]
   Directory (tenant) ID: [Your Tenant ID]
   Supported account types: Any organizational directory and personal accounts
   ```

2. **Required Permissions**

   ```
   Calendars.ReadWrite
   User.Read
   offline_access
   ```

3. **Authentication**
   ```
   Platform: Web
   Redirect URI: https://[your-domain]/api/calendar/outlook/callback
   Access tokens: Yes
   ID tokens: Yes
   ```
