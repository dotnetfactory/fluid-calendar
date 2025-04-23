# Focus Mode Implementation Plan

## Overview

This document outlines the implementation plan for adding a Focus Mode feature to FluidCalendar. The feature will leverage the existing auto-scheduling system to help users focus on their most important tasks.

## Core Features

### 1. Focus Mode UI ✅

- Full-screen overlay with navbar retained
- Minimalist design with reduced visual noise
- Smooth transitions between states
- Quick action buttons for task management

### 2. Task Selection ✅

Leverage existing auto-scheduling system to:

- Select top 3 tasks based on:
  - Schedule score (already implemented)
  - Due dates
  - Priority levels
  - Energy levels
  - Project grouping
- Show why each task was selected
- Allow manual override of selection

### 3. Task Focus View ✅

- Enlarged current task view
- Dimmed secondary tasks
- Progress tracking
- Quick actions:
  - Mark as complete
  - Move to next task
  - Add notes
  - Add subtasks
  - Pause/resume
  - Exit focus mode

### 4. State Management ✅

- Track focus mode state
- Persist focus session data
- Handle interruptions
- Save session statistics

## Implementation Steps

### Phase 1: Core Focus Mode ⚡️ ✅

- [x] Add FocusMode type definitions

  ```typescript
  interface FocusMode {
    isActive: boolean;
    currentTaskId: string | null;
    queuedTaskIds: string[];
    sessionStartTime: Date | null;
    sessionStats: FocusSessionStats;
  }

  interface FocusSessionStats {
    tasksCompleted: number;
    timeSpent: number;
    sessionStart: Date;
    sessionEnd: Date | null;
  }
  ```

- [x] Create focus mode store

  - State management for focus mode
  - Actions for state changes
  - Session tracking

- [x] Implement focus mode component
  - Full-screen overlay
  - Task display
  - Basic controls

### Phase 2: Task Management 📋 ✅

- [x] Integrate with auto-scheduling

  - Reuse existing scoring system
  - Add focus-specific scoring factors
  - Task queue management

- [x] Add task transition logic

  - Complete current task
  - Move to next task
  - Update task status

- [x] Implement quick actions
  - Task completion
  - Task switching
  - Note taking
  - Subtask management

### Phase 3: UI/UX Enhancement 🎨 (In Progress)

- [x] Design and implement transitions

  - Smooth state changes
  - Task switching animations
  - Progress indicators

- [x] Add visual feedback

  - Task completion celebration (using canvas-confetti)
  - Progress visualization
  - Time tracking display

- [ ] Enhance accessibility
  - Keyboard shortcuts (in progress)
  - Screen reader support
  - High contrast mode

### Phase 4: Analytics & Insights 📊 (Planned)

- [ ] Track focus sessions

  - Time spent
  - Tasks completed
  - Break patterns

- [ ] Generate insights
  - Productivity patterns
  - Task completion rates
  - Focus session effectiveness

## Technical Details

### Component Structure

```typescript
// Core Components
- FocusMode
  |- FocusHeader
  |- TaskQueue
  |  |- QueuedTask (x3)
  |- FocusedTask
  |- QuickActions
  |- ActionOverlay (for celebrations and notifications)
```

### State Management

```typescript
// Focus Mode Store
interface FocusModeStore {
  // State
  currentTaskId: string | null;
  isProcessing: boolean;
  actionType: ActionType | null;
  actionMessage: string | null;

  // Actions
  startProcessing: (actionType: ActionType, message?: string) => void;
  stopProcessing: () => void;
  getCurrentTask: () => Task | null;
  getQueuedTasks: () => Task[];
  getQueuedTaskIds: () => string[];
  completeCurrentTask: () => void;
  postponeTask: (duration: string) => void;
}
```

### Integration Points

1. Auto-scheduling System

   - Reuse existing scoring logic
   - Add focus-specific scoring factors
   - Handle task transitions

2. Task Management

   - Update task status
   - Handle completion
   - Manage subtasks

3. UI Components
   - Navbar integration
   - Modal system
   - Animation system with canvas-confetti for celebrations

## Next Steps

### Immediate Actions

1. ✅ Create basic focus mode component structure
2. ✅ Implement core state management
3. ✅ Integrate with auto-scheduling system
4. ✅ Add basic task switching functionality

### Future Enhancements

1. Advanced analytics
2. Custom focus modes
3. Integration with external tools
4. Focus mode templates

## Notes

- Leverage existing auto-scheduling system
- Keep UI minimal and focused
- Ensure smooth transitions
- Prioritize user experience
- Make it keyboard-friendly
