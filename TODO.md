# FluidCalendar Implementation Plan

# BUG
- [ ] if i have a bunch of tasks that have isautoscheduled false and i click autoschedule the UI updates with a blank list because no tasks are returned. i have to refresh the page to get the tasks.
- [ ] auto scheduling is creating task in the past (it might be off by one day)
- [ ] auto scheduling did not schedule high priority tasks first
- [ ] save task completed date and sync it with outlook 
  
## Next Steps
- [ ] Integrate google calendar
  - [ ] auto sync with webhooks
  - [ ] when deleting one event from the series, it deletes all instances locally but google is working fine.
- [ ] prevent adding events to read-only calendars
- [ ] allow changing calendar color
- [ ] allow calendar re-ordering in the UI
- [ ] when deleting a recurring event, it deletes all instances but it shows a random instance which disappears after a sync, also i tried it again and it only deleted the instance locally but the entire series deleted from google.
- [ ] add ability to RSVP
- [ ] show events not RSVPed to
- [ ] show spinner when deleting/creating/updating in event modal
- [ ] Use AI to break down tasks
- [ ] recurring tasks don't indicate that it's recurring
- [ ] Ability to add tasks in calendar view

## Outlook sync issues
- [ ] deleting one instance doesn't sync correctly
- [ ] add real-time updates with webhooks
- [ ] implement offline support

## Tasks
- [ ] task dependencies

## 1. Core Calendar Features
- [ ] Calendar Grid Component
  - [ ] Add month view layout
  - [ ] Implement day view layout
  - [ ] Add navigation between days/weeks/months

## 2. Task Management
- [ ] Task Data Structure
  - [ ] Define task interface (title, description, date, duration, status, etc.)
  - [ ] Create task store using Zustand
  - [ ] Implement CRUD operations for tasks
- [ ] Task UI Components
  - [ ] Create task card component
  - [ ] Add task creation modal
  - [ ] Implement task edit modal
  - [ ] Add task details view
  - [ ] Create task list view in sidebar

## 3. Drag and Drop Features
- [ ] Task Rescheduling
  - [ ] Enable drag and drop between time slots
  - [ ] Add visual feedback during drag
  - [ ] Implement time snapping
  - [ ] Handle task duration during drag
- [ ] Task List Reordering
  - [ ] Allow reordering in list view
  - [ ] Sync order changes with store

## 4. Smart Features
- [ ] Task Auto-scheduling
  - [ ] Implement algorithm for finding free time slots
  - [ ] Add priority-based scheduling
  - [ ] Consider task dependencies
- [ ] Time Blocking
  - [ ] Add ability to block out time
  - [ ] Create different block types (focus, meeting, break)
  - [ ] Allow recurring blocks

## 5. Data Persistence
- [ ] Local Storage
  - [ ] Save tasks to localStorage
  - [ ] Implement data migration strategy
- [ ] State Management
  - [ ] Set up Zustand stores
  - [ ] Add undo/redo functionality
  - [ ] Implement data synchronization

## 6. UI/UX Improvements
- [ ] Animations
  - [ ] Add smooth transitions between views
  - [ ] Implement task drag animation
  - [ ] Add loading states
- [ ] Keyboard Shortcuts
  - [ ] Navigation shortcuts
  - [ ] Task creation/editing shortcuts
  - [ ] View switching shortcuts
- [ ] Responsive Design
  - [ ] Mobile-friendly layout
  - [ ] Touch interactions
  - [ ] Adaptive UI based on screen size

## 7. Advanced Features
- [ ] Dark Mode
  - [ ] Implement theme switching
  - [ ] Add system theme detection
- [ ] Calendar Integrations
  - [ ] Google Calendar sync
  - [ ] iCal support
  - [ ] External calendar subscriptions
- [ ] Task Categories
  - [ ] Add custom categories
  - [ ] Color coding
  - [ ] Category-based filtering

## 8. Performance Optimization
- [ ] Component Optimization
  - [ ] Implement virtualization for long lists
  - [ ] Add lazy loading for views
  - [ ] Optimize re-renders
- [ ] State Management
  - [ ] Add request caching
  - [ ] Implement optimistic updates
  - [ ] Add error boundaries

## 9. Testing
- [ ] Unit Tests
  - [ ] Test core utilities
  - [ ] Test state management
  - [ ] Test UI components
- [ ] Integration Tests
  - [ ] Test user flows
  - [ ] Test data persistence
  - [ ] Test drag and drop functionality

## 10. Documentation
- [ ] Code Documentation
  - [ ] Add JSDoc comments
  - [ ] Document component props
  - [ ] Create usage examples
- [ ] User Documentation
  - [ ] Write user guide
  - [ ] Add keyboard shortcut reference
  - [ ] Create onboarding guide

## 11. Logging System Implementation
- [x] Database Schema
  - [x] Create Log model in Prisma schema
  - [x] Add indexes for efficient querying
  - [x] Run database migrations
- [x] Logger Service
  - [x] Update logger.ts to support DB logging
  - [x] Implement batch logging for performance
  - [x] Add retention policy logic
  - [x] Keep file logging for critical errors
  - [x] Add type safety for metadata and settings
- [x] API Routes
  - [x] Add GET /api/logs endpoint with filtering
  - [x] Add DELETE /api/logs endpoint
  - [x] Add cleanup endpoint
  - [x] Add pagination support
  - [x] Add settings management endpoints
- [x] Settings UI
  - [x] Add log viewer component
  - [x] Add retention policy configuration
  - [x] Add log level configuration
  - [x] Add manual cleanup controls
  - [x] Add log filtering and search
- [x] Commands
  - [x] Add log viewer command
  - [x] Add log cleanup command
  - [x] Add log export command
  - [x] Update command registry
- [ ] Testing & Documentation
  - [ ] Add tests for logger service
  - [ ] Add tests for API endpoints
  - [ ] Document logging system
  - [ ] Add usage examples

## Next Steps for Logging System:
1. Fix linter errors:
   - [x] Fix 'any' type in LogTable and LogViewer components
   - [x] Fix AppRouterInstance import in system commands
   - [x] Fix section type in system commands
   - [x] Fix Command interface and system commands implementation
   - [ ] Fix remaining type issues in other components
2. Add tests:
   - [ ] Unit tests for logger service
   - [ ] Integration tests for API endpoints
   - [ ] UI component tests
3. Add documentation:
   - [ ] API documentation
   - [ ] Usage examples
   - [ ] Configuration guide

## Implementation Order:
1. Database schema and migrations
2. Core logger service updates
3. API endpoints
4. Settings UI and commands
5. Testing and documentation

## Next Steps
1. Implement the calendar grid component
2. Add basic task management
3. Implement drag and drop functionality
4. Add data persistence
5. Enhance UI with animations and responsive design

## Calendar Sync and Auto-scheduling
- [ ] Implement background sync system
  - [ ] Create useCalendarSync custom hook
  - [ ] Add sync status indicators in UI
  - [ ] Implement error handling and retry logic
  - [ ] Add manual sync trigger to command registry
  - [ ] Add sync preferences to settings
  - [ ] Implement proper cleanup on unmount
  - [ ] Add visual indicators for sync status
  - [ ] Add sync error notifications

# Hybrid Client-Server Logging System Implementation

## Implementation Steps
1. Create Logger Structure
   - [x] Create `src/lib/logger/types.ts` for shared interfaces
   - [x] Create `src/lib/logger/server.ts` for server-side DB operations
   - [x] Create `src/lib/logger/client.ts` for client-side batching
   - [x] Create `src/lib/logger/index.ts` for environment detection
   - [x] Update existing logger imports across the app

2. Client-Side Implementation
   - [x] Implement localStorage buffer system
   - [x] Add batch processing logic
   - [x] Add retry mechanism for failed API calls
   - [x] Handle localStorage limits and cleanup
   - [ ] Add compression for stored logs
   - [x] Implement offline recovery
   - [x] Add debug mode for development

3. Server-Side Implementation
   - [x] Move DB operations to server.ts
   - [x] Add batch processing endpoint
   - [ ] Add compression handling
   - [x] Update existing API routes
   - [ ] Add rate limiting
   - [ ] Add validation middleware

4. Shared Features
   - [x] Use date-utils.ts for all timestamps
   - [x] Implement log level filtering
   - [x] Add log rotation
   - [x] Add log cleanup
   - [ ] Add error boundaries

5. Testing & Documentation
   - [ ] Add tests for client logger
   - [ ] Add tests for server logger
   - [ ] Add tests for API endpoints
   - [ ] Document usage examples
   - [ ] Add logging best practices

6. Integration
   - [x] Update LogViewer component
   - [x] Update LogSettings component
   - [x] Update system commands
   - [ ] Add logging commands to command palette 