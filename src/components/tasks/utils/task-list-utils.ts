import {
  TaskStatus,
  TimePreference,
  Priority,
} from "@/types/task";
import {
  format,
  isToday,
  isTomorrow,
  isThisWeek,
  isThisYear,
  newDate,
} from "@/lib/date-utils";

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
