# FluidCalendar: Task Integration and Intelligent Scheduling (Part 3)

Following the Microsoft Outlook calendar integration, I'm excited to share my latest major update to **FluidCalendar**. This release focuses on three key areas: **Microsoft To Do integration**, **enhanced task prioritization**, and a **significantly improved auto-scheduling algorithm**.

👉 **Missed Part 1?** Check out the initial announcement and technical overview: [FluidCalendar: An Open Source Alternative to Motion (Part 1)](https://medium.com/front-end-weekly/fluid-calendar-an-open-source-alternative-to-motion-part-1-7a5b52bf219d)  
👉 **Missed Part 2?** Read about the Outlook integration and other enhancements: [FluidCalendar: Outlook Integration and Enhanced Features (Part 2)](https://medium.com/@eibrahim/fluidcalendar-outlook-integration-and-enhanced-features-part-2-1d3dd2858439)

## Microsoft To Do Integration

One of the most requested features after the Outlook calendar integration was the ability to **import tasks from Microsoft To Do**. This integration brings several benefits:

1. Seamless import of existing tasks and to-dos
2. Mapping of Microsoft To Do lists to **FluidCalendar projects**
3. Automatic scheduling of imported tasks based on list priorities
4. Preservation of task metadata (priority, due dates, etc.)

### Technical Implementation

The Microsoft To Do integration uses the Microsoft Graph API, similar to the Outlook calendar integration. Here’s how I approached it:

```typescript
interface TaskImporter {
  async importFromMicrosoftTodo(userId: string): Promise<Task[]> {
    const todoTasks = await graph.api('/me/todo/lists').expand('tasks').get();
    return todoTasks.map(task => ({
      title: task.title,
      project: mapListToProject(task.parentListId),
      priority: mapMicrosoftPriority(task.importance),
      dueDate: task.dueDateTime?.dateTime,
      duration: calculateTaskDuration(task),
    }));
  }
}
```

Imported tasks are automatically scheduled, ensuring that tasks from specific lists are prioritized according to user preferences.

## Enhanced Task Prioritization

Building on the Microsoft To Do integration, I implemented a more **robust priority system** that works across all task sources:

```typescript
export enum Priority {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

interface Task {
  title: string;
  priority?: Priority;
  project?: string;
  dueDate?: string;
}
```

### Key Improvements:

1. Natural mapping of Microsoft To Do priorities to **FluidCalendar priorities**
2. Enhanced integration with the auto-scheduling algorithm
3. Clear visual indicators in the UI for different priority levels
4. Support for bulk priority updates and project-based prioritization

## The Intelligence Behind Auto-Scheduling

The highlight of this release is the revamped **auto-scheduling algorithm**. Here's how it works:

### Slot Scoring Algorithm

The algorithm uses a scoring system to select the best time slot for each task.

#### **1. Base Score Calculation**

```typescript
interface SlotScore {
  timeSlot: TimeSlot;
  baseScore: number;
  adjustments: ScoreAdjustment[];
  finalScore: number;
}

function calculateSlotScore(slot: TimeSlot, task: Task): SlotScore {
  let score = 100; // Base score
  const adjustments: ScoreAdjustment[] = [];

  // Example: Prioritize high priority tasks
  if (task.priority === Priority.HIGH) {
    adjustments.push({
      factor: "priority",
      value: 20,
      reason: "High priority task",
    });
  }

  return {
    timeSlot: slot,
    baseScore: score,
    adjustments,
    finalScore: score + adjustments.reduce((sum, adj) => sum + adj.value, 0),
  };
}
```

#### **2. Scoring Factors:**

- **Priority Impact**: Higher priority tasks are favored for optimal time slots.
- **Energy Level Matching**: (Optional) Matches task demands with typical user energy levels.
- **Time Preferences**: Considers user-defined preferred working hours.
- **Buffer Times**: Maintains adequate spacing between tasks.

#### **3. Scheduling Steps:**

1. **Task Prioritization:** Sort tasks by priority and due date.
2. **Slot Identification:** Find available time slots and calculate scores.
3. **Optimization:** Balance workload, resolve conflicts, and respect buffer times.
4. **Final Placement:** Schedule tasks in the highest-scoring slots.

## What's Next?

I’d love to hear **your thoughts** on what I should tackle next! Here are a few ideas I’m considering:

- 📝 Import tasks from other platforms like **Asana, Jira, or Google Tasks**
- 🔄 Implement **two-way sync** with Microsoft To Do and Outlook
- 📅 Add support for **CalDAV or iCal calendar integration**
- 💡 Introduce **AI-based scheduling suggestions**

👉 **What feature would make FluidCalendar more valuable for you? Drop your suggestions!**

## Get Involved

You can help shape FluidCalendar’s future:  
✅ Try out the new **Microsoft To Do import**  
✅ Share feedback and feature requests  
✅ Contribute to the codebase on GitHub: [FluidCalendar GitHub Repository](https://github.com/dotnetfactory/fluid-calendar)  
✅ Report edge cases or suggest improvements to the auto-scheduler

## Looking Forward

This update marks another significant step toward making **FluidCalendar** an intelligent, user-friendly productivity tool. Whether you’re organizing personal tasks or managing work projects, the improved task integration and scheduling algorithm aim to make your day more efficient.

👉 **Haven't read the earlier posts?**  
📖 [Part 1 – Building FluidCalendar](https://medium.com/front-end-weekly/fluid-calendar-an-open-source-alternative-to-motion-part-1-7a5b52bf219d)  
📖 [Part 2 – Outlook Integration and Enhanced Features](https://medium.com/@eibrahim/fluidcalendar-outlook-integration-and-enhanced-features-part-2-1d3dd2858439)

Follow me on Twitter [@eibrahim](https://twitter.com/eibrahim) for updates and behind-the-scenes insights. Thanks for your support! 🚀
