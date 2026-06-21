import {
  format,
  isFutureDate,
  isThisWeek,
  isThisYear,
  isToday,
  isTomorrow,
  newDate,
} from "@/lib/date-utils";

import {
  EnergyLevel,
  Priority,
  Task,
  TaskStatus,
  TimePreference,
} from "@/types/task";

/**
 * A task is "upcoming" when it has a start date that falls on a later calendar
 * day than today. This is the single source of truth shared by the Tasks list
 * "Hide upcoming tasks" filter and the "Upcoming" badge, so the two can never
 * disagree about which tasks are upcoming. Uses day-granularity (`isFutureDate`)
 * rather than an instant comparison, so a task starting later today is not
 * treated as upcoming.
 */
export const isUpcomingTask = (task: Pick<Task, "startDate">): boolean => {
  return Boolean(task.startDate) && isFutureDate(task.startDate ?? null);
};

// Filter settings consumed by the Tasks list view (subset of
// useTaskListViewSettings relevant to per-task filtering).
export interface TaskListFilterSettings {
  status?: TaskStatus[];
  energyLevel?: EnergyLevel[];
  timePreference?: TimePreference[];
  tagIds?: string[];
  search?: string;
  hideUpcomingTasks?: boolean;
}

/**
 * Decide whether a single task passes the current Tasks list filters. Pure and
 * unit-testable; the list component maps this over the (project-filtered) tasks.
 */
export const taskMatchesListFilters = (
  task: Task,
  filters: TaskListFilterSettings
): boolean => {
  const { status, energyLevel, timePreference, tagIds, search } = filters;

  // Status filter
  if (status?.length && !status.includes(task.status)) {
    return false;
  }

  // Hide upcoming (future-day) tasks
  if (filters.hideUpcomingTasks && isUpcomingTask(task)) {
    return false;
  }

  // Energy level filter
  if (
    energyLevel?.length &&
    (!task.energyLevel || !energyLevel.includes(task.energyLevel))
  ) {
    return false;
  }

  // Time preference filter
  if (
    timePreference?.length &&
    (!task.preferredTime || !timePreference.includes(task.preferredTime))
  ) {
    return false;
  }

  // Tags filter
  if (tagIds?.length) {
    const taskTagIds = task.tags.map((t) => t.id);
    if (!tagIds.some((id) => taskTagIds.includes(id))) {
      return false;
    }
  }

  // Search
  if (search) {
    const searchLower = search.toLowerCase();
    return (
      task.title.toLowerCase().includes(searchLower) ||
      (task.description?.toLowerCase().includes(searchLower) ?? false) ||
      task.tags.some((tag) => tag.name.toLowerCase().includes(searchLower))
    );
  }

  return true;
};

// Helper function to format enum values for display
export const formatEnumValue = (value: string) => {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const statusColors = {
  [TaskStatus.TODO]: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  [TaskStatus.IN_PROGRESS]: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  [TaskStatus.COMPLETED]: "bg-green-500/20 text-green-700 dark:text-green-400",
};

export const energyLevelColors = {
  high: "bg-red-500/20 text-red-700 dark:text-red-400",
  medium: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  low: "bg-green-500/20 text-green-700 dark:text-green-400",
};

export const timePreferenceColors = {
  [TimePreference.MORNING]: "bg-sky-500/20 text-sky-700 dark:text-sky-400",
  [TimePreference.AFTERNOON]:
    "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  [TimePreference.EVENING]:
    "bg-indigo-500/20 text-indigo-700 dark:text-indigo-400",
};

export const priorityColors = {
  [Priority.HIGH]: "bg-red-500/20 text-red-700 dark:text-red-400",
  [Priority.MEDIUM]: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  [Priority.LOW]: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  [Priority.NONE]: "bg-muted text-muted-foreground",
};

// Semantic rank for the Priority column so the Tasks list sorts by meaning
// (none < low < medium < high) instead of alphabetically by the enum label.
export const PRIORITY_SORT_RANK: Record<Priority, number> = {
  [Priority.NONE]: 0,
  [Priority.LOW]: 1,
  [Priority.MEDIUM]: 2,
  [Priority.HIGH]: 3,
};

// Semantic rank for the Energy column (low < medium < high).
export const ENERGY_LEVEL_SORT_RANK: Record<EnergyLevel, number> = {
  [EnergyLevel.LOW]: 1,
  [EnergyLevel.MEDIUM]: 2,
  [EnergyLevel.HIGH]: 3,
};

// Look up a value's rank in a rank map, returning undefined for missing values
// AND for any value not present in the map. The DB stores priority/energyLevel
// as plain strings, so a stale or externally-imported value (e.g. "urgent")
// can reach the comparator; we treat such unknown values like a missing value
// rather than producing NaN.
const rankOf = (
  value: string | null | undefined,
  ranks: Record<string, number>
): number | undefined => {
  if (value == null) return undefined;
  // Use hasOwn so prototype keys ("toString", "__proto__", ...) don't resolve
  // to an inherited property; an unknown string is treated like a missing one.
  return Object.hasOwn(ranks, value) ? ranks[value] : undefined;
};

// Compare two rank lookups so missing/unknown values always sort last,
// regardless of direction (matching the other nullable columns), and two
// missing/unknown values compare equal (stable). `direction` is 1 (asc) or -1
// (desc).
const compareRanks = (
  rankA: number | undefined,
  rankB: number | undefined,
  direction: number
): number => {
  if (rankA === undefined && rankB === undefined) return 0;
  if (rankA === undefined) return 1;
  if (rankB === undefined) return -1;
  return direction * (rankA - rankB);
};

// Comparator for sorting tasks by priority rank. `direction` is 1 (asc) or -1
// (desc), matching how the Tasks list applies its sort direction. Tasks with no
// priority (or an unrecognized value) always sort last, regardless of
// direction, like the other nullable columns.
export const compareTaskPriority = (
  a: Pick<Task, "priority">,
  b: Pick<Task, "priority">,
  direction: number
): number =>
  compareRanks(
    rankOf(a.priority, PRIORITY_SORT_RANK),
    rankOf(b.priority, PRIORITY_SORT_RANK),
    direction
  );

// Comparator for sorting tasks by energy-level rank. Same direction and
// missing/unknown-last semantics as compareTaskPriority.
export const compareTaskEnergyLevel = (
  a: Pick<Task, "energyLevel">,
  b: Pick<Task, "energyLevel">,
  direction: number
): number =>
  compareRanks(
    rankOf(a.energyLevel, ENERGY_LEVEL_SORT_RANK),
    rankOf(b.energyLevel, ENERGY_LEVEL_SORT_RANK),
    direction
  );

// Format date in a contextual way (Today, Tomorrow, etc.)
export const formatContextualDate = (date: Date) => {
  const now = newDate();
  const isOverdue = date < now && !isToday(date);
  let text;

  if (isToday(date)) {
    text = `Today, ${format(date, "p")}`;
  } else if (isTomorrow(date)) {
    text = `Tomorrow, ${format(date, "p")}`;
  } else if (isThisWeek(date)) {
    text = format(date, "EEEE, p");
  } else if (isThisYear(date)) {
    text = format(date, "MMM d, p");
  } else {
    text = format(date, "MMM d, yyyy, p");
  }

  return { text, isOverdue };
};
