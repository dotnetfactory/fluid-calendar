# CalDAV Integration Implementation Plan

## Overview
This document outlines the implementation plan for adding CalDAV calendar support to FluidCalendar. This feature will enable users to connect and sync with CalDAV-compatible calendar servers (like NextCloud, Radicale, Baikal, etc.), expanding the calendar integration options beyond the current Google Calendar support.

## CalDAV Integration Details

The CalDAV integration system will handle authentication, synchronization, and CRUD operations for CalDAV calendars. This component is responsible for:

### 1. Core Interfaces
```typescript
interface CalDAVAccount {
  id: string;
  provider: "CALDAV";
  serverUrl: string;
  username: string;
  credentials: string; // encrypted
  email?: string;
  calendars: CalDAVCalendar[];
  discoveryUrl?: string;
}

interface CalDAVCalendar {
  id: string;
  url: string;
  displayName: string;
  color?: string;
  description?: string;
  timezone?: string;
  ctag: string;
  syncToken?: string;
}

interface CalDAVEvent {
  uid: string;
  etag: string;
  url: string;
  data: string; // iCal format
  lastModified: Date;
  sequence: number;
}
```

### 2. Core Responsibilities
- **Authentication Management**
  - Basic Auth support
  - Token-based auth support
  - Credential encryption
  - Connection testing
  - Auto-discovery support

- **Calendar Synchronization**
  - Initial calendar discovery
  - Efficient change detection (ctag/etag)
  - Incremental sync support
  - Conflict resolution
  - Error recovery

- **Event Management**
  - CRUD operations for events
  - Recurring event handling
  - Attachment support
  - Rich text description
  - Custom property support

- **Security & Error Handling**
  - Secure credential storage
  - SSL/TLS certificate validation
  - Connection timeout handling
  - Retry mechanisms
  - Offline support

### 3. Implementation Approach
```typescript
class CalDAVServiceImpl implements CalendarService {
  constructor(
    private prisma: PrismaClient,
    private settings: SystemSettings
  ) {}

  async connect(serverUrl: string, credentials: CalDAVCredentials): Promise<CalDAVAccount> {
    // 1. Validate server URL
    // 2. Attempt connection
    // 3. Discover calendars
    // 4. Store encrypted credentials
    // 5. Return account info
  }

  async sync(account: CalDAVAccount): Promise<void> {
    // 1. Check calendar changes (ctag)
    // 2. Fetch changed events (etag)
    // 3. Apply local changes
    // 4. Handle conflicts
    // 5. Update sync tokens
  }

  async createEvent(calendar: CalDAVCalendar, event: CalendarEvent): Promise<CalDAVEvent> {
    // 1. Convert to iCal
    // 2. Upload to server
    // 3. Store sync metadata
    // 4. Return created event
  }
}
```

### 4. Key Components
1. **CalDAV Client**
   - Server communication
   - iCal parsing/generation
   - Authentication handling
   - Request/response management

2. **Sync Engine**
   ```typescript
   interface SyncEngine {
     getChanges(calendar: CalDAVCalendar): Promise<{
       created: CalDAVEvent[];
       updated: CalDAVEvent[];
       deleted: string[];
     }>;
     
     applyChanges(changes: SyncChanges): Promise<void>;
     
     resolveConflicts(local: CalDAVEvent, remote: CalDAVEvent): Promise<CalDAVEvent>;
   }
   ```

3. **Security Manager**
   ```typescript
   interface SecurityManager {
     encryptCredentials(credentials: CalDAVCredentials): string;
     decryptCredentials(encrypted: string): CalDAVCredentials;
     validateCertificate(cert: Certificate): boolean;
     generateAuthHeaders(credentials: CalDAVCredentials): Headers;
   }
   ```

### 5. Edge Cases to Handle
- Self-signed certificates
- Different server implementations
- Network interruptions
- Timezone conversions
- Recurring event modifications
- Partial sync failures
- Rate limiting
- Server redirects

## Implementation Status

### 🚧 Phase 1: Foundation Setup (Current Focus)
- [ ] Database Schema Updates
  - [ ] Add CalDAV account model
  - [ ] Add CalDAV calendar model
  - [ ] Add sync metadata tables
  - [ ] Add proper indexes
- [ ] Basic CalDAV Client
  - [ ] Server connection
  - [ ] Basic authentication
  - [ ] Calendar discovery
  - [ ] Simple CRUD operations
- [ ] Security Infrastructure
  - [ ] Credential encryption
  - [ ] Certificate validation
  - [ ] Auth header generation

### ⏳ Phase 2: Core Integration (Planned)
- [ ] Calendar Integration
  - [ ] Full CRUD support
  - [ ] Recurring event handling
  - [ ] Property mapping
  - [ ] Error handling
- [ ] Sync Engine
  - [ ] Change detection
  - [ ] Incremental sync
  - [ ] Conflict resolution
  - [ ] Retry mechanisms
- [ ] UI Integration
  - [ ] Account management
  - [ ] Calendar selection
  - [ ] Sync status display
  - [ ] Error reporting

### ⏳ Phase 3: Advanced Features (Planned)
- [ ] Auto-discovery
  - [ ] Well-known URL support
  - [ ] DNS-based discovery
  - [ ] Multiple protocols
- [ ] Enhanced Sync
  - [ ] Batch operations
  - [ ] Delta sync
  - [ ] Offline support
- [ ] Rich Features
  - [ ] Attachment handling
  - [ ] Custom properties
  - [ ] Categories/tags
  - [ ] Sharing support

## Next Implementation Steps

1. Database Schema
   ```sql
   -- CalDAV Account
   CREATE TABLE caldav_accounts (
     id TEXT PRIMARY KEY,
     server_url TEXT NOT NULL,
     username TEXT NOT NULL,
     credentials TEXT NOT NULL,
     email TEXT,
     discovery_url TEXT,
     created_at TIMESTAMP NOT NULL,
     updated_at TIMESTAMP NOT NULL
   );

   -- CalDAV Calendar
   CREATE TABLE caldav_calendars (
     id TEXT PRIMARY KEY,
     account_id TEXT NOT NULL,
     url TEXT NOT NULL,
     display_name TEXT NOT NULL,
     color TEXT,
     ctag TEXT,
     sync_token TEXT,
     FOREIGN KEY (account_id) REFERENCES caldav_accounts(id)
   );
   ```

2. Security Implementation
   ```typescript
   interface CredentialManager {
     encrypt(data: string): Promise<string>;
     decrypt(encrypted: string): Promise<string>;
     validate(serverUrl: string): Promise<boolean>;
   }
   ```

3. UI Components
   ```typescript
   interface CalDAVConnectionForm {
     serverUrl: string;
     username: string;
     password: string;
     autoDiscover: boolean;
   }
   ```

4. API Routes
   ```typescript
   // POST /api/calendar/caldav/auth
   // GET /api/calendar/caldav/discover
   // GET /api/calendar/caldav/calendars
   // POST /api/calendar/caldav/sync
   ```

## Technical Considerations

1. **Security**
   - Credentials must be encrypted at rest
   - Support for various auth methods
   - Proper certificate validation
   - Rate limiting implementation

2. **Performance**
   - Efficient sync algorithms
   - Batch operations where possible
   - Caching strategies
   - Background sync support

3. **Reliability**
   - Robust error handling
   - Automatic retry logic
   - Conflict resolution
   - Data validation

4. **User Experience**
   - Simple connection process
   - Clear error messages
   - Sync status indicators
   - Easy calendar selection

## Dependencies

1. **Required Libraries**
   - `tsdav` - CalDAV client
   - `ical.js` - iCal parsing
   - `crypto-js` - Credential encryption
   - `date-fns-tz` - Timezone handling

2. **Development Tools**
   - CalDAV test server
   - SSL certificates
   - Test accounts
   - Performance monitoring

## Testing Strategy

1. **Unit Tests**
   - Client operations
   - Data parsing
   - Security functions
   - Sync logic

2. **Integration Tests**
   - Server communication
   - Full sync cycles
   - Error scenarios
   - Concurrent operations

3. **End-to-End Tests**
   - Account connection
   - Calendar operations
   - UI interactions
   - Error handling

## Documentation Requirements

1. **User Documentation**
   - Connection guide
   - Troubleshooting steps
   - Security best practices
   - Feature overview

2. **Developer Documentation**
   - Architecture overview
   - API documentation
   - Security considerations
   - Extension points 