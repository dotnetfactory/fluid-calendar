# Auto-Scheduling Implementation Plan

## Overview
This document outlines the implementation plan for adding auto-scheduling capabilities to FluidCalendar. The feature will intelligently schedule tasks based on calendar availability, task properties, and user preferences while maintaining flexibility and ease of use.

## Time Slot Management Details

Time slot management is the foundation of the auto-scheduling system. It handles identifying and evaluating potential time periods where tasks can be scheduled. This component is responsible for:

### 1. Time Slot Identification
```typescript
interface TimeSlot {
  start: Date;
  end: Date;
  score: number;
  conflicts: Conflict[];
  energyLevel: EnergyLevel;
  isWithinWorkHours: boolean;
  hasBufferTime: boolean;
}

interface TimeSlotManager {
  // Find all possible slots for a given duration
  findAvailableSlots(
    duration: number,
    startDate: Date,
    endDate: Date
  ): TimeSlot[];
  
  // Check if a specific time slot is available
  isSlotAvailable(slot: TimeSlot): boolean;
  
  // Calculate buffer times around a slot
  calculateBufferTimes(slot: TimeSlot): {
    beforeBuffer: TimeSlot;
    afterBuffer: TimeSlot;
  };
}
```

### 2. Core Responsibilities
- **Work Hours Enforcement**
  - Filter slots based on user's working hours
  - Handle different work hours for different days
  - Consider timezone differences

- **Buffer Time Management**
  - Maintain minimum buffer between tasks
  - Handle buffer preferences at task boundaries
  - Adjust buffers based on task types/durations

- **Conflict Detection**
  - Check for overlaps with existing calendar events
  - Consider events from selected calendars only
  - Handle recurring events properly
  - Detect conflicts with other auto-scheduled tasks

- **Slot Scoring**
  - Score slots based on multiple factors:
    1. Work hours alignment (higher score during preferred hours)
    2. Energy level match (matching task energy level with time of day)
    3. Project grouping (bonus for slots near related tasks)
    4. Buffer time adequacy
    5. Distance from preferred time
    6. Distance from deadline

### 3. Implementation Approach
```typescript
class TimeSlotManagerImpl implements TimeSlotManager {
  constructor(
    private settings: AutoScheduleSettings,
    private calendarService: CalendarService
  ) {}

  async findAvailableSlots(
    duration: number,
    startDate: Date,
    endDate: Date
  ): Promise<TimeSlot[]> {
    // 1. Generate potential slots
    const potentialSlots = this.generatePotentialSlots(duration, startDate, endDate);
    
    // 2. Filter by work hours
    const workHourSlots = this.filterByWorkHours(potentialSlots);
    
    // 3. Check calendar conflicts
    const availableSlots = await this.removeConflicts(workHourSlots);
    
    // 4. Apply buffer times
    const slotsWithBuffer = this.applyBufferTimes(availableSlots);
    
    // 5. Score slots
    const scoredSlots = this.scoreSlots(slotsWithBuffer);
    
    // 6. Sort by score
    return this.sortByScore(scoredSlots);
  }

  private generatePotentialSlots(
    duration: number,
    startDate: Date,
    endDate: Date
  ): TimeSlot[] {
    // Generate slots at regular intervals
    // Consider minimum slot duration
    // Handle day boundaries
  }

  private filterByWorkHours(slots: TimeSlot[]): TimeSlot[] {
    // Check against work days
    // Verify work hours
    // Handle timezone differences
  }

  private async removeConflicts(slots: TimeSlot[]): Promise<TimeSlot[]> {
    // Check calendar events
    // Consider selected calendars only
    // Handle recurring events
  }

  private applyBufferTimes(slots: TimeSlot[]): TimeSlot[] {
    // Add buffer before/after
    // Adjust for adjacent tasks
    // Handle minimum buffers
  }

  private scoreSlots(slots: TimeSlot[]): TimeSlot[] {
    // Score based on multiple factors
    // Weight different criteria
    // Consider preferences
  }
}
```

### 4. Key Algorithms
1. **Slot Generation**
   - Start with the earliest possible time
   - Generate slots at fixed intervals
   - Consider minimum duration requirements
   - Handle overnight periods

2. **Conflict Resolution**
   - Use interval tree for efficient overlap detection
   - Handle partial overlaps
   - Consider buffer times in conflict detection

3. **Scoring System**
   ```typescript
   interface SlotScore {
     total: number;
     factors: {
       workHourAlignment: number;
       energyLevelMatch: number;
       projectProximity: number;
       bufferAdequacy: number;
       timePreference: number;
       deadlineProximity: number;
     };
   }
   ```

### 5. Edge Cases to Handle
- Tasks spanning multiple days
- Daylight saving time transitions
- Different work hours on different days
- Overlapping buffer times
- Recurring calendar events
- Time zone conversions
- Holiday/weekend considerations

## Implementation Status

### ✅ Phase 1: Foundation Setup (Completed)
- [x] Database Schema Updates
  - [x] Added auto-scheduling fields to Task model
  - [x] Created AutoScheduleSettings model
  - [x] Added calendar selection preferences
  - [x] Added proper relations and indexes
- [x] Settings UI Updates
  - [x] Created AutoScheduleSettings component
  - [x] Added calendar selection interface
  - [x] Added work hours configuration
  - [x] Added energy level time mapping
  - [x] Added buffer time settings
  - [x] Added project grouping option
- [x] Basic Settings Integration
  - [x] Added settings store integration
  - [x] Added JSON handling for arrays in postgres
  - [x] Added utility functions for settings management
  - [x] Added proper type definitions

### ✅ Phase 2: Scheduling Engine Core (Completed)
- [x] Time Slot Management
  - [x] Work hours enforcement
  - [x] Buffer time handling
  - [x] Calendar conflict avoidance
  - [x] Comprehensive slot scoring system
    - [x] Work hour alignment scoring
    - [x] Energy level matching
    - [x] Project proximity scoring
    - [x] Buffer adequacy scoring
    - [x] Time preference scoring
    - [x] Deadline proximity scoring
- [x] Task Analysis System
  - [x] Priority calculation system
  - [x] Basic duration estimation
  - [x] Complexity assessment
  - [x] Initial recurrence pattern detection

### 🚧 Phase 3: UI Integration (Current Focus)
- [x] Task UI Updates
  - [x] Add auto-schedule toggle to task card/form
  - [x] Show scheduling status and scheduled time
  - [x] Add manual override controls
  - [x] Display scheduling confidence/score
- [ ] Calendar Integration
  - [ ] Visual distinction for auto-scheduled tasks
  - [ ] Drag-and-drop rescheduling support
  - [ ] Buffer time visualization
  - [ ] Conflict indicators
- [ ] Batch Operations
  - [ ] Bulk auto-schedule interface
  - [ ] Rescheduling triggers
  - [ ] Schedule optimization controls

## Next Implementation Steps

1. Task UI Enhancement
   ```typescript
   interface AutoScheduleControls {
     isAutoScheduled: boolean;
     scheduledTime: Date | null;
     confidence: number;
     canOverride: boolean;
   }
   ```

   Features to implement:
   - Toggle switch for auto-scheduling
   - Scheduled time display with confidence indicator
   - Quick actions for rescheduling
   - Manual override options

2. Calendar Visualization
   ```typescript
   interface AutoScheduleEvent extends CalendarEvent {
     isAutoScheduled: boolean;
     confidence: number;
     originalTime?: Date;
     scheduleReason?: string;
   }
   ```

   Key components:
   - Distinct styling for auto-scheduled tasks
   - Hover tooltips with scheduling info
   - Buffer time indicators
   - Conflict warnings

3. Batch Operations
   ```typescript
   interface BatchScheduler {
     scheduleMultiple(tasks: Task[]): Promise<ScheduleResult[]>;
     optimizeDay(date: Date): Promise<OptimizationResult>;
     handleConflicts(changes: ScheduleChange[]): Promise<Resolution[]>;
   }
   ```

   Implementation plan:
   - Bulk scheduling interface
   - Day/week optimization
   - Conflict resolution UI
   - Schedule quality indicators

## Technical Considerations

1. User Experience
   - Clear visual feedback
   - Intuitive controls
   - Easy manual adjustments
   - Helpful explanations

2. Performance
   - Smooth animations
   - Responsive controls
   - Efficient updates
   - Background processing

3. Reliability
   - Undo/redo support
   - Error handling
   - State persistence
   - Conflict resolution

## Questions to Address

1. How should we handle manual overrides?
   - Keep or disable auto-scheduling
   - Respect user preferences
   - Handle future conflicts

2. What visual indicators are most helpful?
   - Schedule confidence
   - Conflict warnings
   - Buffer times
   - Optimization suggestions

3. When should we trigger rescheduling?
   - Calendar changes
   - Task updates
   - Manual overrides
   - Settings changes

## Next Steps

### Immediate Priority: Basic UI Integration
1. Task Card Updates
   - Add auto-schedule toggle
   - Show scheduled time
   - Add confidence indicator
   - Include override controls

2. Calendar View Integration
   - Implement distinct styling
   - Add hover information
   - Show buffer times
   - Indicate conflicts

3. Testing Interface
   - Quick scheduling controls
   - Clear visual feedback
   - Easy preference adjustments
   - Result visualization

Would you like to proceed with:
1. Implementing the task card updates
2. Adding calendar view enhancements
3. Creating the testing interface
4. Building batch operations 