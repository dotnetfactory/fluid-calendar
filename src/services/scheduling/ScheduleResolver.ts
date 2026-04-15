import { Schedule, ScheduleTimeBlock, Task, Project, Area } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type ScheduleWithBlocks = Schedule & { timeBlocks: ScheduleTimeBlock[] };

type ProjectWithArea = Project & { area: Area | null };
type TaskWithProject = Task & { project: ProjectWithArea | null };

/**
 * Resolve the effective schedule for a task.
 * Priority: task.scheduleId > project.scheduleId > area.scheduleId > 24/7 system schedule
 */
export function resolveScheduleId(task: TaskWithProject): string | null {
  return task.scheduleId
    || task.project?.scheduleId
    || task.project?.area?.scheduleId
    || null;
}

/**
 * Load all schedules for a user, indexed by ID.
 * Also returns the system (24/7) schedule separately.
 *
 * The system schedule's time blocks are derived from Calendar Settings
 * working hours, so users configure availability in one place.
 */
export async function loadSchedules(userId: string) {
  const schedules = await prisma.schedule.findMany({
    where: { userId },
    include: {
      timeBlocks: { orderBy: [{ dayOfWeek: "asc" }, { startHour: "asc" }] },
    },
  });

  // Load working hours from Calendar Settings to use for the system schedule
  const calSettings = await prisma.calendarSettings.findUnique({
    where: { userId },
  });

  const byId = new Map<string, ScheduleWithBlocks>();
  let systemSchedule: ScheduleWithBlocks | null = null;

  for (const schedule of schedules) {
    if (schedule.isSystem) {
      // Override system schedule time blocks with Calendar Settings working hours
      if (calSettings) {
        const days: number[] = JSON.parse(calSettings.workingHoursDays || "[1,2,3,4,5]");
        const [startHour, startMinute] = (calSettings.workingHoursStart || "09:00").split(":").map(Number);
        const [endHour, endMinute] = (calSettings.workingHoursEnd || "17:00").split(":").map(Number);

        schedule.timeBlocks = days.map((day) => ({
          id: `system-${day}`,
          scheduleId: schedule.id,
          dayOfWeek: day,
          startHour,
          startMinute,
          endHour,
          endMinute,
        }));
      }
      systemSchedule = schedule;
    }
    byId.set(schedule.id, schedule);
  }

  if (!systemSchedule) {
    throw new Error("System (24/7) schedule not found for user " + userId);
  }

  return { schedules, byId, systemSchedule };
}

/**
 * Group tasks by their resolved schedule.
 * Returns groups ordered: named schedules first (alphabetical), system schedule last.
 */
export function groupTasksBySchedule(
  tasks: TaskWithProject[],
  scheduleMap: Map<string, ScheduleWithBlocks>,
  systemSchedule: ScheduleWithBlocks
): { schedule: ScheduleWithBlocks; tasks: Task[] }[] {
  const groups = new Map<string, { schedule: ScheduleWithBlocks; tasks: Task[] }>();

  for (const task of tasks) {
    const scheduleId = resolveScheduleId(task);
    const schedule =
      (scheduleId ? scheduleMap.get(scheduleId) : null) || systemSchedule;

    let group = groups.get(schedule.id);
    if (!group) {
      group = { schedule, tasks: [] };
      groups.set(schedule.id, group);
    }
    group.tasks.push(task);
  }

  // Sort: named schedules first (alphabetical), system schedule last
  const result = Array.from(groups.values()).sort((a, b) => {
    if (a.schedule.isSystem && !b.schedule.isSystem) return 1;
    if (!a.schedule.isSystem && b.schedule.isSystem) return -1;
    return a.schedule.name.localeCompare(b.schedule.name);
  });

  return result;
}
