import { Schedule, ScheduleTimeBlock, Task, Project } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type ScheduleWithBlocks = Schedule & { timeBlocks: ScheduleTimeBlock[] };

type TaskWithProject = Task & { project: Project | null };

/**
 * Resolve the effective schedule for a task.
 * Priority: task.scheduleId > project.scheduleId > 24/7 system schedule
 */
export function resolveScheduleId(task: TaskWithProject): string | null {
  return task.scheduleId || task.project?.scheduleId || null;
}

/**
 * Load all schedules for a user, indexed by ID.
 * Also returns the system (24/7) schedule separately.
 */
export async function loadSchedules(userId: string) {
  const schedules = await prisma.schedule.findMany({
    where: { userId },
    include: {
      timeBlocks: { orderBy: [{ dayOfWeek: "asc" }, { startHour: "asc" }] },
    },
  });

  const byId = new Map<string, ScheduleWithBlocks>();
  let systemSchedule: ScheduleWithBlocks | null = null;

  for (const schedule of schedules) {
    byId.set(schedule.id, schedule);
    if (schedule.isSystem) {
      systemSchedule = schedule;
    }
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
