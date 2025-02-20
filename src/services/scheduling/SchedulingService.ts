import { PrismaClient, Task, AutoScheduleSettings } from "@prisma/client";
import { TimeSlotManagerImpl, TimeSlotManager } from "./TimeSlotManager";
import { CalendarServiceImpl } from "./CalendarServiceImpl";
import { useSettingsStore } from "@/store/settings";
import { addDays } from "@/lib/date-utils";
import { logger } from "@/lib/logger";

const DEFAULT_TASK_DURATION = 30; // Default duration in minutes

export class SchedulingService {
  private prisma: PrismaClient;
  private calendarService: CalendarServiceImpl;
  private settings: AutoScheduleSettings | null;

  constructor(settings?: AutoScheduleSettings) {
    this.prisma = new PrismaClient();
    this.calendarService = new CalendarServiceImpl(this.prisma);
    this.settings = settings || null;
  }

  private getTimeSlotManager(): TimeSlotManagerImpl {
    let settings: AutoScheduleSettings;

    if (this.settings) {
      settings = this.settings;
    } else {
      // Fallback to store settings if none provided (for backward compatibility)
      const storeSettings = useSettingsStore.getState().autoSchedule;
      settings = {
        ...storeSettings,
        id: "store",
        userId: "store",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // logger.log("[DEBUG] Creating TimeSlotManager with settings", {
    //   workHours: {
    //     start: settings.workHourStart,
    //     end: settings.workHourEnd,
    //   },
    //   workDays: settings.workDays,
    //   selectedCalendars: settings.selectedCalendars,
    //   bufferMinutes: settings.bufferMinutes,
    //   timeZone: useSettingsStore.getState().user.timeZone,
    // });

    return new TimeSlotManagerImpl(settings, this.calendarService, this.prisma);
  }

  async scheduleMultipleTasks(tasks: Task[]): Promise<Task[]> {
    // logger.log("[DEBUG] Starting to schedule multiple tasks", {
    //   tasks: tasks.map((t) => ({
    //     id: t.id,
    //     title: t.title,
    //     duration: t.duration || DEFAULT_TASK_DURATION,
    //     dueDate: t.dueDate,
    //   })),
    // });

    // Clear existing schedules for non-locked tasks
    const tasksToSchedule = tasks.filter((t) => !t.scheduleLocked);
    // logger.log(
    //   `[DEBUG] ${tasksToSchedule.length} tasks to schedule (excluding locked tasks)`
    // );

    await this.prisma.task.updateMany({
      where: {
        id: {
          in: tasksToSchedule.map((t) => t.id),
        },
      },
      data: {
        scheduledStart: null,
        scheduledEnd: null,
        isAutoScheduled: false,
      },
    });
    // logger.log("[DEBUG] Cleared existing schedules for non-locked tasks");

    // Sort tasks by due date
    const sortedTasks = [...tasksToSchedule].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.getTime() - b.dueDate.getTime();
    });
    // logger.log("[DEBUG] Sorted tasks by due date", {
    //   tasks: sortedTasks.map((t) => ({
    //     id: t.id,
    //     title: t.title,
    //     dueDate: t.dueDate,
    //     duration: t.duration || DEFAULT_TASK_DURATION,
    //   })),
    // });

    const timeSlotManager = this.getTimeSlotManager();
    const updatedTasks: Task[] = [];

    // Schedule each task
    for (const task of sortedTasks) {
      const taskWithDuration = {
        ...task,
        duration: task.duration || DEFAULT_TASK_DURATION,
      };

      // logger.log("[DEBUG] Attempting to schedule task", {
      //   id: taskWithDuration.id,
      //   title: taskWithDuration.title,
      //   duration: taskWithDuration.duration,
      // });

      const scheduledTask = await this.scheduleTask(
        taskWithDuration,
        timeSlotManager
      );
      if (scheduledTask) {
        // logger.log("[DEBUG] Successfully scheduled task", {
        //   id: scheduledTask.id,
        //   title: scheduledTask.title,
        //   start: scheduledTask.scheduledStart,
        //   end: scheduledTask.scheduledEnd,
        //   duration: scheduledTask.duration,
        // });
        updatedTasks.push(scheduledTask);
      } else {
        // logger.log("[DEBUG] Failed to schedule task", {
        //   id: task.id,
        //   title: task.title,
        //   duration: taskWithDuration.duration,
        // });
      }
    }

    // Get all tasks (including locked ones) to return
    const allTasks = await this.prisma.task.findMany({
      where: {
        id: {
          in: tasks.map((t) => t.id),
        },
      },
    });

    // logger.log("[DEBUG] Scheduling complete. Results", {
    //   totalTasks: tasks.length,
    //   scheduledTasks: updatedTasks.length,
    //   failedTasks: tasksToSchedule.length - updatedTasks.length,
    //   lockedTasks: tasks.length - tasksToSchedule.length,
    // });

    return allTasks;
  }

  private async scheduleTask(
    task: Task,
    timeSlotManager: TimeSlotManager
  ): Promise<Task | null> {
    const now = new Date();
    const windows = [
      { days: 7, label: "1 week" },
      { days: 14, label: "2 weeks" },
      { days: 30, label: "1 month" },
    ];

    for (const window of windows) {
      // logger.log(`[DEBUG] Trying ${window.label} window for task`, {
      //   id: task.id,
      //   title: task.title,
      //   duration: task.duration || DEFAULT_TASK_DURATION,
      // });

      const endDate = addDays(now, window.days);
      const availableSlots = await timeSlotManager.findAvailableSlots(
        task,
        now,
        endDate
      );

      if (availableSlots.length > 0) {
        // logger.log(
        //   `[DEBUG] Found ${availableSlots.length} available slots in ${window.label} window`
        // );
        const bestSlot = availableSlots[0]; // Already sorted by score

        // logger.log("[DEBUG] Selected best slot", {
        //   start: bestSlot.start,
        //   end: bestSlot.end,
        //   duration: task.duration || DEFAULT_TASK_DURATION,
        // });

        // Update the task with the selected slot
        const updatedTask = await this.prisma.task.update({
          where: { id: task.id },
          data: {
            scheduledStart: bestSlot.start,
            scheduledEnd: bestSlot.end,
            isAutoScheduled: true,
            duration: task.duration || DEFAULT_TASK_DURATION,
            scheduleScore: bestSlot.score,
          },
        });

        return updatedTask;
      } else {
        logger.log(`No available slots found in ${window.label} window`);
      }
    }

    // logger.log("[DEBUG] Failed to find any available slots for task", {
    //   id: task.id,
    //   title: task.title,
    //   duration: task.duration || DEFAULT_TASK_DURATION,
    // });

    return null;
  }
}
