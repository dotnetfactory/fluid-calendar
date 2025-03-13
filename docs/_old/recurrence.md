# Task Recurrence Implementation

## Overview

The task recurrence system implements a "rolling single instance" model. Instead of creating and showing multiple future instances of a recurring task, we maintain only one active instance at a time. This approach provides a cleaner user experience and simpler data management.

## Core Concepts

### Rolling Single Instance Model

- Only one instance of a recurring task is visible at any time
- The visible instance is always the most recent incomplete occurrence
- When completed, the next occurrence is automatically calculated and becomes the active instance
- Missed occurrences remain visible until completed

### Example Scenario

For a task that recurs every Monday:
1. If today is Wednesday and last Monday's task is incomplete:
   - The last Monday's instance remains visible and actionable
2. Once completed:
   - The completion is recorded
   - A new instance is created for next Monday
3. If kept up to date:
   - You'll always see the next upcoming Monday's instance

## Data Model

```typescript
interface Task {
    // ... existing task fields ...
    recurrenceRule?: string;     // RRule string for calculating next occurrence
    lastCompletedDate?: Date;    // When the last instance was completed
    nextDueDate: Date;           // The next/current due date
}
```

## Implementation Details

### Creating a Recurring Task

1. Save the basic task details
2. Store the recurrence pattern as an RRule string (e.g., "FREQ=WEEKLY;BYDAY=MO")
3. Set the initial `nextDueDate` to the first occurrence
4. No instances are created upfront

### Completing a Task

When a recurring task instance is completed:
1. Record the completion by updating `lastCompletedDate`
2. Calculate the next occurrence using the RRule pattern
3. Update `nextDueDate` to the next occurrence
4. The task remains a single record in the database

### Viewing Tasks

- Only one instance of each recurring task is visible
- For overdue tasks: shows the missed instance
- For current tasks: shows the next upcoming instance
- The task list/calendar remains clean and actionable

## Advantages

1. **Simplified Data Model**
   - Single record per recurring task
   - No need to manage multiple instances
   - Easier to modify recurrence patterns

2. **Better User Experience**
   - Clear what needs to be done
   - No overwhelming list of future instances
   - Natural handling of missed tasks

3. **Technical Benefits**
   - Lower database overhead
   - Simpler state management
   - Easier to maintain and modify

4. **Flexible Handling**
   - Naturally handles missed tasks
   - Easy to modify recurrence patterns
   - Simple to track completion history

## Implementation Considerations

### RRule Usage
- Use RRule for calculating next occurrences
- Store patterns in standard RRule format
- Supports complex recurrence patterns if needed

### State Management
- Track only essential dates (lastCompleted, nextDue)
- Calculate other dates as needed
- Keep the data model minimal

### UI Considerations
- Clearly indicate recurring tasks (e.g., with an icon)
- Show recurrence pattern in task details
- Provide clear completion actions

## Implementation Plan

### Phase 1: Core Data Model & Basic Functionality
- [x] Update Task type definition with recurrence fields
- [x] Add RRule dependency and type definitions
- [x] Modify task creation API endpoint to handle recurrence
- [x] Update task completion logic to handle recurring tasks
- [x] Add basic recurrence UI fields to TaskModal
- [x] Update task store to handle recurring task operations
- [x] Add visual indicator for recurring tasks in TaskList/Calendar

### Phase 2: Enhanced UI & Validation
- [x] Implement RRule builder UI component
- [x] Add recurrence preview in TaskModal
- [x] Implement recurrence pattern validation
- [ ] Add confirmation dialogs for recurring task operations
- [x] Enhance task details view with recurrence information
- [x] Add tooltips and help text for recurrence options

### Phase 3: Calendar Integration & Polish
- [x] Update calendar view to properly display recurring tasks
- [x] Implement proper date calculations for different timezones
- [x] Add recurrence pattern editing capabilities
- [ ] Implement task history view
- [ ] Add bulk operations for recurring tasks
- [ ] Final UI polish and optimization

### Phase 4: Testing & Documentation
- [ ] Add unit tests for recurrence calculations
- [ ] Add integration tests for recurring task operations
- [ ] Add E2E tests for critical user flows
- [ ] Update API documentation
- [ ] Add user documentation for recurring tasks
- [ ] Performance testing and optimization

## Implementation Details

### RRule Integration
The system uses the RRule library for handling recurrence patterns. The implementation supports:
- Daily, weekly, monthly, and yearly recurrence
- Custom intervals (e.g., every 2 weeks)
- Weekly recurrence with specific weekday selection
- Proper timezone handling for recurring events

### Task Completion Handling
When a recurring task is completed:
1. The completion is recorded with `lastCompletedDate`
2. The next occurrence is automatically calculated using RRule
3. The task's `dueDate` is updated to the next occurrence
4. The status is reset to "TODO" for the next instance

### Calendar Integration
The calendar view has been enhanced to:
- Display recurring tasks with proper visual indicators
- Handle timezone conversions for recurring events
- Support both task-based and calendar-based recurring events
- Properly expand recurring events within the selected date range

### Data Synchronization
- Google Calendar integration supports bi-directional sync of recurring events
- Recurring tasks maintain consistency between local and remote calendars
- Proper handling of modified instances in recurring series

## Future Enhancements

Potential areas for future expansion:
1. Support for more complex recurrence patterns
2. Enhanced completion history tracking
3. Statistics for recurring task completion rates
4. Bulk operations for recurring tasks
5. Export/import of recurring task definitions 